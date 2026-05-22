import { app, BrowserWindow, Menu, ipcMain, globalShortcut } from "electron";
import path from "node:path";
import logger from "electron-log";
import { getDatabase, closeDatabase } from "./database";

interface DocRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted?: number;
  deleted_at?: string;
}

interface QuestionRow {
  id: string;
  document_id: string;
  text: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_deleted?: number;
  deleted_at?: string;
}

interface AnswerRow {
  id: string;
  question_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ExistsRow {
  "1": number;
}

logger.initialize();
logger.transports.file.resolvePathFn = () => path.join(process.cwd(), "cm.log");

ipcMain.handle("log-to-file", (_, level: string, message: string) => {
  const logLevels: Record<string, (msg: string) => void> = {
    error: logger.error,
    warn: logger.warn,
    info: logger.info,
    debug: logger.debug,
  };
  const logMethod = logLevels[level] || logger.info;
  logMethod(message);
});

// Document IPC handlers
ipcMain.handle("db:findAll", (_, options?: { isDeleted?: boolean }) => {
  const database = getDatabase();
  const isDeleted = options?.isDeleted ? 1 : 0;
  const docs = database
    .prepare("SELECT * FROM documents WHERE is_deleted = ? ORDER BY updated_at DESC")
    .all(isDeleted) as DocRow[];

  return docs.map((doc) => {
    const questions = database
      .prepare("SELECT * FROM questions WHERE document_id = ? ORDER BY sort_order")
      .all(doc.id) as QuestionRow[];
    const answers = database
      .prepare("SELECT * FROM answers WHERE question_id IN (SELECT id FROM questions WHERE document_id = ?)")
      .all(doc.id) as AnswerRow[];
    return {
      id: doc.id,
      title: doc.title,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      deletedAt: doc.deleted_at,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        order: q.sort_order,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        isDeleted: q.is_deleted,
        deletedAt: q.deleted_at,
      })),
      answers: answers.map((a) => ({
        id: a.id,
        questionId: a.question_id,
        content: a.content,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
    };
  });
});

ipcMain.handle("db:findById", (_, id: string) => {
  const database = getDatabase();
  const doc = database.prepare("SELECT * FROM documents WHERE id = ?").get(id) as DocRow | undefined;
  if (!doc) {
    return null;
  }

  const questions = database
    .prepare("SELECT * FROM questions WHERE document_id = ? ORDER BY sort_order")
    .all(doc.id) as QuestionRow[];
  const answers = database
    .prepare("SELECT * FROM answers WHERE question_id IN (SELECT id FROM questions WHERE document_id = ?)")
    .all(doc.id) as AnswerRow[];

  return {
    id: doc.id,
    title: doc.title,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    deletedAt: doc.deleted_at,
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      order: q.sort_order,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
      isDeleted: q.is_deleted,
      deletedAt: q.deleted_at,
    })),
    answers: answers.map((a) => ({
      id: a.id,
      questionId: a.question_id,
      content: a.content,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    })),
  };
});

ipcMain.handle("db:save", (_, documentJson: string) => {
  const database = getDatabase();
  const doc = JSON.parse(documentJson);
  const now = new Date().toISOString();

  const transaction = database.transaction(() => {
    database
      .prepare(
        "INSERT INTO documents (id, title, created_at, updated_at, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at",
      )
      .run(doc.id, doc.title, doc.createdAt ?? now, doc.updatedAt ?? now, 0, null);

    database.prepare("DELETE FROM questions WHERE document_id = ?").run(doc.id);
    for (const q of doc.questions ?? []) {
      database
        .prepare("INSERT INTO questions (id, document_id, text, sort_order, created_at, updated_at, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(q.id, doc.id, q.text, q.order, q.createdAt ?? now, q.updatedAt ?? now, q.isDeleted ? 1 : 0, q.deletedAt ?? null);
    }

    database.prepare("DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE document_id = ?)").run(doc.id);
    for (const a of doc.answers ?? []) {
      database
        .prepare(
          "INSERT INTO answers (id, question_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run(a.id, a.questionId, a.content, a.createdAt ?? now, a.updatedAt ?? now);
    }
  });

  transaction();
});

ipcMain.handle("db:softDelete", (_, id: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare("UPDATE documents SET is_deleted = 1, deleted_at = ? WHERE id = ?")
    .run(now, id);
});

ipcMain.handle("db:restore", (_, id: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare("UPDATE documents SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?")
    .run(now, id);
});

ipcMain.handle("db:delete", (_, id: string) => {
  const database = getDatabase();
  database.prepare("DELETE FROM documents WHERE id = ?").run(id);
});

ipcMain.handle("db:exists", (_, id: string) => {
  const database = getDatabase();
  const row = database.prepare("SELECT 1 FROM documents WHERE id = ? AND is_deleted = 0").get(id) as ExistsRow | undefined;
  return !!row;
});

// Answer IPC handlers
ipcMain.handle("answer:findByQuestionId", (_, questionId: string) => {
  const database = getDatabase();
  const answer = database.prepare("SELECT * FROM answers WHERE question_id = ?").get(questionId) as AnswerRow | undefined;
  if (!answer) return null;
  return {
    id: answer.id,
    questionId: answer.question_id,
    content: answer.content,
    createdAt: answer.created_at,
    updatedAt: answer.updated_at,
  };
});

ipcMain.handle("answer:save", (_, answerJson: string) => {
  const database = getDatabase();
  const answer = JSON.parse(answerJson);
  const now = new Date().toISOString();

  database
    .prepare(
      "INSERT INTO answers (id, question_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(question_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at",
    )
    .run(answer.id, answer.questionId, answer.content, answer.createdAt ?? now, answer.updatedAt ?? now);
});

ipcMain.handle("answer:delete", (_, id: string) => {
  const database = getDatabase();
  database.prepare("DELETE FROM answers WHERE id = ?").run(id);
});

// Question IPC handlers (soft delete)
ipcMain.handle("question:softDelete", (_, documentId: string, questionId: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare("UPDATE questions SET is_deleted = 1, deleted_at = ? WHERE id = ? AND document_id = ?")
    .run(now, questionId, documentId);
});

ipcMain.handle("question:restore", (_, documentId: string, questionId: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare("UPDATE questions SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ? AND document_id = ?")
    .run(now, questionId, documentId);
});

ipcMain.handle("question:getDeleted", (_, documentId: string) => {
  const database = getDatabase();
  const questions = database
    .prepare("SELECT id, text, deleted_at FROM questions WHERE document_id = ? AND is_deleted = 1 ORDER BY deleted_at DESC")
    .all(documentId) as Array<{ id: string; text: string; deleted_at: string }>;
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    deletedAt: q.deleted_at,
  }));
});

ipcMain.handle("question:permanentlyDelete", (_, documentId: string, questionId: string) => {
  const database = getDatabase();
  // 先删除关联的回答（级联删除）
  database.prepare("DELETE FROM answers WHERE question_id = ?").run(questionId);
  // 再删除问题
  database.prepare("DELETE FROM questions WHERE id = ? AND document_id = ?").run(questionId, documentId);
});

ipcMain.handle("question:clearDeleted", (_, documentId: string) => {
  const database = getDatabase();
  // 获取所有已删除的问题ID
  const deletedQuestions = database
    .prepare("SELECT id FROM questions WHERE document_id = ? AND is_deleted = 1")
    .all(documentId) as Array<{ id: string }>;
  // 删除关联的回答
  for (const q of deletedQuestions) {
    database.prepare("DELETE FROM answers WHERE question_id = ?").run(q.id);
  }
  // 删除问题
  database.prepare("DELETE FROM questions WHERE document_id = ? AND is_deleted = 1").run(documentId);
});

function openSettings() {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send("open-settings");
  } else {
    logger.error("No focused window, cannot open settings");
  }
}

const DIST = path.join(__dirname, "../renderer");
const VITE_PUBLIC = app.isPackaged ? DIST : path.join(DIST, "../public");

process.env.DIST = DIST;
process.env.VITE_PUBLIC = VITE_PUBLIC;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(DIST, "index.html"));
  }

  win.webContents.on("preload-error", (_, preloadPath, error) => {
    logger.error(`Preload error for ${preloadPath}: ${error.message}`);
  });
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "设置",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            if (win) {
              win.webContents.send("open-settings");
            } else {
              logger.error("Window is null, cannot send open-settings");
            }
          },
        },
        { type: "separator" },
        { role: "quit", label: "退出" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  getDatabase();
  createWindow();
  createMenu();

  const shortcutRegistered = globalShortcut.register("Ctrl+,", openSettings);
  if (!shortcutRegistered) {
    logger.error("Failed to register global shortcut Ctrl+,");
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  closeDatabase();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
