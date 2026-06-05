import { app, BrowserWindow, Menu, ipcMain, globalShortcut } from "electron";
import path from "node:path";
import { log } from "./logger";
import { getDatabase, closeDatabase } from "./database";
import { SearchService } from "../src/infrastructure/search/SearchService";
import type {
  DocRow,
  QuestionRow,
  AnswerRow,
  ExistsRow,
  TagRow,
} from "../src/types/db";
import type {
  DocumentInput,
  QuestionInput,
  AnswerInput,
} from "../src/types/dto";
import { exportData, importData } from "./importExport";
import { dataDirManager } from "./DataDirManager";

// 初始化数据目录（确保 py-data 目录存在）
dataDirManager.init();

// 请求单实例锁，防止应用多开（仅生产环境）
if (app.isPackaged) {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    // 如果没有获得锁，说明已有实例在运行，退出当前实例
    app.quit();
  } else {
    // 获得锁，监听 second-instance 事件
    // 当第二个实例启动时，聚焦到第一个实例的窗口
    app.on("second-instance", () => {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      }
    });
  }
}

const logLevels: Record<string, (msg: string) => void> = {
  error: log.error,
  warn: log.warn,
  info: log.info,
  debug: log.debug,
};

ipcMain.handle("render-log", (_, level: string, message: string) => {
  const logMethod = logLevels[level] || log.info;
  logMethod(message);
});

// Document IPC handlers
ipcMain.handle("db:findAll", (_, options?: { isDeleted?: boolean }) => {
  const database = getDatabase();
  const docs = database
    .prepare(
      options?.isDeleted === undefined
        ? "SELECT * FROM documents ORDER BY updated_at DESC"
        : "SELECT * FROM documents WHERE is_deleted = ? ORDER BY updated_at DESC",
    )
    .all(
      ...(options?.isDeleted === undefined ? [] : [options.isDeleted ? 1 : 0]),
    ) as unknown as DocRow[];

  return docs.map((doc) => {
    const questions = database
      .prepare(
        "SELECT * FROM questions WHERE document_id = ? ORDER BY sort_order",
      )
      .all(doc.id) as unknown as QuestionRow[];
    const answers = database
      .prepare(
        "SELECT * FROM answers WHERE question_id IN (SELECT id FROM questions WHERE document_id = ?)",
      )
      .all(doc.id) as unknown as AnswerRow[];
    const tags = database
      .prepare(
        "SELECT t.* FROM tags t JOIN document_tags dt ON t.id = dt.tag_id WHERE dt.document_id = ?",
      )
      .all(doc.id) as unknown as TagRow[];
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
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.created_at,
      })),
    };
  });
});

ipcMain.handle("db:findById", (_, id: string) => {
  const database = getDatabase();
  const doc = database
    .prepare("SELECT * FROM documents WHERE id = ?")
    .get(id) as DocRow | undefined;
  if (!doc) {
    return null;
  }

  const questions = database
    .prepare(
      "SELECT * FROM questions WHERE document_id = ? ORDER BY sort_order",
    )
    .all(doc.id) as unknown as QuestionRow[];
  const answers = database
    .prepare(
      "SELECT * FROM answers WHERE question_id IN (SELECT id FROM questions WHERE document_id = ?)",
    )
    .all(doc.id) as unknown as AnswerRow[];
  const tags = database
    .prepare(
      "SELECT t.* FROM tags t JOIN document_tags dt ON t.id = dt.tag_id WHERE dt.document_id = ?",
    )
    .all(doc.id) as unknown as TagRow[];

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
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.created_at,
    })),
  };
});

ipcMain.handle("db:softDelete", (_, id: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare("UPDATE documents SET is_deleted = 1, deleted_at = ? WHERE id = ?")
    .run(now, id);
  SearchService.deleteDocument(database, id);
});

ipcMain.handle("db:restore", (_, id: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare(
      "UPDATE documents SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?",
    )
    .run(now, id);
  SearchService.updateDocument(database, id);
});

ipcMain.handle("db:exists", (_, id: string) => {
  const database = getDatabase();
  const row = database
    .prepare("SELECT 1 FROM documents WHERE id = ? AND is_deleted = 0")
    .get(id) as ExistsRow | undefined;
  return !!row;
});

// Answer IPC handlers
ipcMain.handle("answer:findByQuestionId", (_, questionId: string) => {
  const database = getDatabase();
  const answer = database
    .prepare("SELECT * FROM answers WHERE question_id = ?")
    .get(questionId) as AnswerRow | undefined;
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
    .run(
      answer.id,
      answer.questionId,
      answer.content,
      answer.createdAt ?? now,
      answer.updatedAt ?? now,
    );
  SearchService.updateAnswer(database, answer.id);
});

ipcMain.handle("answer:delete", (_, id: string) => {
  const database = getDatabase();
  database.prepare("DELETE FROM answers WHERE id = ?").run(id);
});

// Question IPC handlers (soft delete)
ipcMain.handle(
  "question:softDelete",
  (_, documentId: string, questionId: string) => {
    const database = getDatabase();
    const now = new Date().toISOString();
    database
      .prepare(
        "UPDATE questions SET is_deleted = 1, deleted_at = ? WHERE id = ? AND document_id = ?",
      )
      .run(now, questionId, documentId);
  },
);

ipcMain.handle(
  "question:restore",
  (_, documentId: string, questionId: string) => {
    const database = getDatabase();
    const now = new Date().toISOString();
    database
      .prepare(
        "UPDATE questions SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ? AND document_id = ?",
      )
      .run(now, questionId, documentId);
  },
);

ipcMain.handle("question:getDeleted", (_, documentId: string) => {
  const database = getDatabase();
  const questions = database
    .prepare(
      "SELECT id, text, deleted_at FROM questions WHERE document_id = ? AND is_deleted = 1 ORDER BY deleted_at DESC",
    )
    .all(documentId) as Array<{ id: string; text: string; deleted_at: string }>;
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    deletedAt: q.deleted_at,
  }));
});

ipcMain.handle(
  "question:permanentlyDelete",
  (_, documentId: string, questionId: string) => {
    const database = getDatabase();
    // 先删除关联的回答（级联删除）
    database
      .prepare("DELETE FROM answers WHERE question_id = ?")
      .run(questionId);
    // 再删除问题
    database
      .prepare("DELETE FROM questions WHERE id = ? AND document_id = ?")
      .run(questionId, documentId);
  },
);

ipcMain.handle("question:clearDeleted", (_, documentId: string) => {
  const database = getDatabase();
  // 获取所有已删除的问题ID
  const deletedQuestions = database
    .prepare(
      "SELECT id FROM questions WHERE document_id = ? AND is_deleted = 1",
    )
    .all(documentId) as Array<{ id: string }>;
  // 删除关联的回答
  for (const q of deletedQuestions) {
    database.prepare("DELETE FROM answers WHERE question_id = ?").run(q.id);
  }
  // 删除问题
  database
    .prepare("DELETE FROM questions WHERE document_id = ? AND is_deleted = 1")
    .run(documentId);
});

// Tag IPC handlers
ipcMain.handle("tag:findAll", () => {
  const database = getDatabase();
  const tags = database
    .prepare("SELECT * FROM tags ORDER BY created_at DESC")
    .all() as unknown as TagRow[];
  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
  }));
});

ipcMain.handle("tag:findById", (_, id: string) => {
  const database = getDatabase();
  const tag = database.prepare("SELECT * FROM tags WHERE id = ?").get(id) as
    | TagRow
    | undefined;
  if (!tag) return null;
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.created_at,
  };
});

ipcMain.handle("tag:findByName", (_, name: string) => {
  const database = getDatabase();
  const tag = database
    .prepare("SELECT * FROM tags WHERE name = ?")
    .get(name) as TagRow | undefined;
  if (!tag) return null;
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.created_at,
  };
});

ipcMain.handle("tag:save", (_, tagJson: string) => {
  const database = getDatabase();
  const tag = JSON.parse(tagJson);
  const now = new Date().toISOString();
  database
    .prepare(
      "INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name",
    )
    .run(tag.id, tag.name, tag.createdAt ?? now);
  SearchService.updateTag(database, tag.id);
});

ipcMain.handle("tag:delete", (_, id: string) => {
  const database = getDatabase();
  database.prepare("DELETE FROM tags WHERE id = ?").run(id);
  SearchService.deleteTag(database, id);
});

ipcMain.handle("tag:exists", (_, name: string) => {
  const database = getDatabase();
  const row = database
    .prepare("SELECT 1 FROM tags WHERE name = ?")
    .get(name) as ExistsRow | undefined;
  return !!row;
});

ipcMain.handle("tag:addToDocument", (_, documentId: string, tagId: string) => {
  const database = getDatabase();
  database
    .prepare(
      "INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
    )
    .run(documentId, tagId);
  SearchService.updateTag(database, tagId);
  SearchService.updateDocument(database, documentId);
});

ipcMain.handle(
  "tag:removeFromDocument",
  (_, documentId: string, tagId: string) => {
    const database = getDatabase();
    database
      .prepare("DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?")
      .run(documentId, tagId);
    SearchService.updateTag(database, tagId);
    SearchService.updateDocument(database, documentId);
  },
);

ipcMain.handle("tag:getDocumentTags", (_, documentId: string) => {
  const database = getDatabase();
  const tags = database
    .prepare(
      "SELECT t.* FROM tags t JOIN document_tags dt ON t.id = dt.tag_id WHERE dt.document_id = ?",
    )
    .all(documentId) as unknown as TagRow[];
  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
  }));
});

ipcMain.handle("tag:findDocumentsByTagId", (_, tagId: string) => {
  const database = getDatabase();
  const docs = database
    .prepare(
      `
      SELECT d.* FROM documents d
      JOIN document_tags dt ON d.id = dt.document_id
      WHERE dt.tag_id = ? AND d.is_deleted = 0
      ORDER BY d.updated_at DESC
    `,
    )
    .all(tagId) as unknown as DocRow[];
  return docs.map((doc) => {
    const questions = database
      .prepare(
        "SELECT * FROM questions WHERE document_id = ? ORDER BY sort_order",
      )
      .all(doc.id) as unknown as QuestionRow[];
    const answers = database
      .prepare(
        "SELECT * FROM answers WHERE question_id IN (SELECT id FROM questions WHERE document_id = ?)",
      )
      .all(doc.id) as unknown as AnswerRow[];
    const tags = database
      .prepare(
        "SELECT t.* FROM tags t JOIN document_tags dt ON t.id = dt.tag_id WHERE dt.document_id = ?",
      )
      .all(doc.id) as unknown as TagRow[];
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
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.created_at,
      })),
    };
  });
});

// Search IPC handlers
ipcMain.on("shortcut:open-search", (event) => {
  event.sender.send("shortcut:open-search");
});
ipcMain.handle("search:querySearch", async (_, query: string) => {
  const database = getDatabase();
  const searchService = new SearchService(database);
  return await searchService.querySearch(query);
});

// Transaction IPC handlers for DDD repository pattern
const activeTransactions = new Map<string, ReturnType<typeof getDatabase>>();

ipcMain.handle("db:transaction:begin", () => {
  const database = getDatabase();
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  database.exec("BEGIN TRANSACTION");
  activeTransactions.set(txId, database);
  return txId;
});

ipcMain.handle("db:transaction:commit", (_, txId: string) => {
  const database = activeTransactions.get(txId);
  if (!database) {
    throw new Error(`Transaction not found: ${txId}`);
  }
  database.exec("COMMIT");
  activeTransactions.delete(txId);
});

ipcMain.handle("db:transaction:rollback", (_, txId: string) => {
  const database = activeTransactions.get(txId);
  if (!database) {
    throw new Error(`Transaction not found: ${txId}`);
  }
  database.exec("ROLLBACK");
  activeTransactions.delete(txId);
});

ipcMain.handle("db:document:save", (_, doc: DocumentInput) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare(
      "INSERT INTO documents (id, title, created_at, updated_at, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at",
    )
    .run(
      doc.id,
      doc.title,
      doc.createdAt ?? now,
      doc.updatedAt ?? now,
      0,
      null,
    );
  SearchService.updateDocument(database, doc.id);
});

ipcMain.handle("db:document:delete", (_, id: string) => {
  const database = getDatabase();
  // 先删除搜索索引（需要关联数据）
  SearchService.deleteDocument(database, id);
  // 删除文档关联的标签
  database.prepare("DELETE FROM document_tags WHERE document_id = ?").run(id);
  // 删除文档关联的问题和答案
  database
    .prepare(
      "DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE document_id = ?)",
    )
    .run(id);
  database.prepare("DELETE FROM questions WHERE document_id = ?").run(id);
  // 删除文档
  database.prepare("DELETE FROM documents WHERE id = ?").run(id);
});

ipcMain.handle(
  "db:questions:save",
  (_, docId: string, questions: QuestionInput[]) => {
    const database = getDatabase();
    const now = new Date().toISOString();
    for (const q of questions) {
      database
        .prepare(
          `INSERT INTO questions (id, document_id, text, sort_order, created_at, updated_at, is_deleted, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           text = excluded.text,
           sort_order = excluded.sort_order,
           updated_at = excluded.updated_at,
           is_deleted = excluded.is_deleted,
           deleted_at = excluded.deleted_at`,
        )
        .run(
          q.id,
          docId,
          q.text,
          q.order,
          q.createdAt ?? now,
          q.updatedAt ?? now,
          q.isDeleted ? 1 : 0,
          q.deletedAt ?? null,
        );
      SearchService.updateQuestion(database, q.id);
    }
  },
);

ipcMain.handle("db:questions:delete", (_, ids: string[]) => {
  const database = getDatabase();
  for (const id of ids) {
    SearchService.deleteQuestion(database, id);
    database.prepare("DELETE FROM answers WHERE question_id = ?").run(id);
    database.prepare("DELETE FROM questions WHERE id = ?").run(id);
  }
});

ipcMain.handle(
  "db:answers:save",
  (_, docId: string, answers: AnswerInput[]) => {
    const database = getDatabase();
    const now = new Date().toISOString();

    // Get all question IDs for this document
    const questionIds = database
      .prepare("SELECT id FROM questions WHERE document_id = ?")
      .all(docId) as Array<{ id: string }>;
    const validQuestionIds = new Set(questionIds.map((q) => q.id));

    // Delete answers for questions not in the new set
    const answerQuestionIds = answers.map((a) => a.questionId);
    for (const qid of validQuestionIds) {
      if (!answerQuestionIds.includes(qid)) {
        database.prepare("DELETE FROM answers WHERE question_id = ?").run(qid);
      }
    }

    // Upsert all answers
    for (const a of answers) {
      database
        .prepare(
          `INSERT INTO answers (id, question_id, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           content = excluded.content,
           updated_at = excluded.updated_at`,
        )
        .run(
          a.id,
          a.questionId,
          a.content,
          a.createdAt ?? now,
          a.updatedAt ?? now,
        );
      SearchService.updateAnswer(database, a.id);
    }
  },
);

ipcMain.handle("db:answers:delete", (_, ids: string[]) => {
  const database = getDatabase();
  for (const id of ids) {
    SearchService.deleteAnswer(database, id);
    database.prepare("DELETE FROM answers WHERE id = ?").run(id);
  }
});

function openSettings() {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send("open-settings");
  } else {
    log.error("No focused window, cannot open settings");
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
    icon: path.join(__dirname, "../../public/favicon.ico"),
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
    log.error(`Preload error for ${preloadPath}: ${error.message}`);
  });
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "导出数据",
          click: exportData,
        },
        {
          label: "导入数据",
          click: importData,
        },
        { type: "separator" },
        {
          label: "设置",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            if (win) {
              win.webContents.send("open-settings");
            } else {
              log.error("Window is null, cannot send open-settings");
            }
          },
        },
        { type: "separator" },
        { role: "quit", label: "退出" },
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
        { role: "zoomIn", accelerator: "Ctrl+=" },
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
  const db = getDatabase();
  createWindow();
  createMenu();

  // 检查是否需要重建索引（首次安装或索引为空时）
  const countResult = db
    .prepare("SELECT COUNT(*) as count FROM search_fts")
    .get() as { count: number };
  if (countResult.count === 0) {
    log.info("Search index is empty, rebuilding...");
    const searchService = new SearchService(db);
    searchService
      .rebuildIndex()
      .then(() => {
        log.info("Search index rebuilt successfully");
      })
      .catch((err) => {
        log.error(
          `Failed to rebuild search index: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  }

  const shortcutRegistered = globalShortcut.register("Ctrl+,", openSettings);
  if (!shortcutRegistered) {
    log.error("Failed to register global shortcut Ctrl+,");
  }

  // Ctrl+F 打开搜索面板（已在渲染进程通过 keydown 处理）

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
