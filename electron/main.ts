import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  globalShortcut,
  shell,
  Tray,
  nativeImage,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import { log } from "./logger";
import { getDatabase, closeDatabase } from "./database";
import { SearchService } from "../src/infrastructure/search/SearchService";
import type { DocRow, QuestionRow, AnswerRow, ExistsRow, TagRow } from "../src/types/db";
import type { DocumentInput, QuestionInput, AnswerInput, DocumentDTO } from "../src/types/dto";
import { exportData, importData } from "./importExport";
import { dataDirManager } from "./DataDirManager";
import { formatMarkdown } from "./formatMarkdown";

// 初始化数据目录（确保 py-data 目录存在）
dataDirManager.init();

// 托盘与退出标识：点关闭时最小化到托盘，仅通过「退出」真正退出
let tray: Tray | null = null;
let isQuitting = false;

const MAIN_WINDOW_ICON = "public/favicon.ico";

// e2e 环境禁用托盘，保证测试关闭时应用能正常退出
const IS_E2E = process.env.E2E === "1";

/**
 * 解析应用图标路径：dev 指向项目 public，打包后用 extraResources 放入的 resources 目录
 */
function getAppIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, MAIN_WINDOW_ICON);
  }
  return path.join(__dirname, "../../", MAIN_WINDOW_ICON);
}

// 请求单实例锁；第二个实例会触发 first-instance 的 second-instance 事件，
// 由第一个实例新建窗口，实现单进程多窗口。
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    createWindow();
  });
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

// 版本信息 IPC handler（仅应用版本号）
ipcMain.handle("get-version", () => app.getVersion());

// markdown 格式化 IPC：按 .markdownlint.jsonc 规则 fix 回答内容
ipcMain.handle("answer:formatMarkdown", async (_event, content: string) => {
  return formatMarkdown(content);
});

// 数据目录 IPC handler
ipcMain.handle("get-data-path", () => dataDirManager.getDbDir());

ipcMain.handle("open-data-dir", () => shell.openPath(dataDirManager.getDbDir()));

// 默认字体中文名映射：首次生成 font-family-map.toml 时写入，用户可自行维护
const DEFAULT_FONT_FAMILY_MAP: Record<string, string> = {
  "Microsoft YaHei": "微软雅黑",
  "Microsoft YaHei UI": "微软雅黑 UI",
  "PingFang SC": "苹方",
  "Hiragino Sans GB": "冬青黑体",
  "Noto Sans SC": "思源黑体",
  "Noto Serif SC": "思源宋体",
  "Source Han Sans SC": "思源黑体",
  "Source Han Serif SC": "思源宋体",
  SimSun: "宋体",
  NSimSun: "新宋体",
  SimHei: "黑体",
  KaiTi: "楷体",
  FangSong: "仿宋",
  DengXian: "等线",
  "Sarasa Mono SC": "更纱黑体",
  "Sarasa UI SC": "更纱黑体",
  "Sarasa Term SC": "更纱黑体",
  "Sarasa Gothic SC": "更纱黑体",
};

// 逐行解析字体映射 toml：注释、空行与不规范行直接跳过，单个坏行不影响其余行
function parseFontFamilyMap(content: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const match = line.match(/^"?([^"=]+?)"?\s*=\s*"([^"]*)"$/);
    if (!match) {
      continue;
    }
    const key = match[1].trim().replace(/^"|"$/g, "");
    const value = match[2];
    if (key && value) {
      map[key] = value;
    }
  }
  return map;
}

// 读取字体中文名映射：文件不存在时写入默认模板；读取失败时回退默认映射
ipcMain.handle("read-font-family-map", () => {
  const filePath = path.join(dataDirManager.getDbDir(), "font-family-map.toml");
  try {
    if (!fs.existsSync(filePath)) {
      const lines = Object.entries(DEFAULT_FONT_FAMILY_MAP).map(
        ([key, value]) => `"${key}" = "${value}"`,
      );
      fs.writeFileSync(
        filePath,
        [
          "# 字体英文 family → 中文显示名映射",
          '# 每行一个映射，语法："英文族名" = "中文名"',
          "# 不规范的行会被跳过，不影响其他行",
          ...lines,
          "",
        ].join("\n"),
      );
    }
    return parseFontFamilyMap(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    log.error(`read font-family-map failed: ${String(error)}`);
    return { ...DEFAULT_FONT_FAMILY_MAP };
  }
});

type DatabaseType = ReturnType<typeof getDatabase>;

// 批量加载全部文档并分组子数据，将 findAllDocuments 的 N+1 查询收敛为 3 条批量查询（性能优化）
function loadDocumentBatch(
  database: DatabaseType,
  isDeleted?: boolean,
): {
  docs: DocRow[];
  questionsByDoc: Map<string, QuestionRow[]>;
  answersByQuestion: Map<string, AnswerRow[]>;
  tagsByDoc: Map<string, Array<{ id: string; name: string; created_at: string }>>;
} {
  const docs = database
    .prepare(
      isDeleted === undefined
        ? "SELECT * FROM documents ORDER BY updated_at DESC"
        : "SELECT * FROM documents WHERE is_deleted = ? ORDER BY updated_at DESC",
    )
    .all(...(isDeleted === undefined ? [] : [isDeleted ? 1 : 0])) as unknown as DocRow[];

  const whereDeleted = isDeleted === undefined ? "" : " WHERE d.is_deleted = ?";
  const params = isDeleted === undefined ? [] : [isDeleted ? 1 : 0];

  const questionRows = database
    .prepare("SELECT q.* FROM questions q JOIN documents d ON q.document_id = d.id" + whereDeleted)
    .all(...params) as unknown as QuestionRow[];
  const answerRows = database
    .prepare(
      "SELECT a.* FROM answers a JOIN questions q ON a.question_id = q.id JOIN documents d ON q.document_id = d.id" +
        whereDeleted,
    )
    .all(...params) as unknown as AnswerRow[];
  const tagRows = database
    .prepare(
      "SELECT t.id, t.name, t.created_at, dt.document_id FROM tags t JOIN document_tags dt ON t.id = dt.tag_id JOIN documents d ON dt.document_id = d.id" +
        whereDeleted,
    )
    .all(...params) as unknown as Array<{
    id: string;
    name: string;
    created_at: string;
    document_id: string;
  }>;

  const questionsByDoc = new Map<string, QuestionRow[]>();
  for (const q of questionRows) {
    const list = questionsByDoc.get(q.document_id);
    if (list) list.push(q);
    else questionsByDoc.set(q.document_id, [q]);
  }

  const answersByQuestion = new Map<string, AnswerRow[]>();
  for (const a of answerRows) {
    const list = answersByQuestion.get(a.question_id);
    if (list) list.push(a);
    else answersByQuestion.set(a.question_id, [a]);
  }

  const tagsByDoc = new Map<string, Array<{ id: string; name: string; created_at: string }>>();
  for (const t of tagRows) {
    const list = tagsByDoc.get(t.document_id);
    const tag = { id: t.id, name: t.name, created_at: t.created_at };
    if (list) list.push(tag);
    else tagsByDoc.set(t.document_id, [tag]);
  }

  return { docs, questionsByDoc, answersByQuestion, tagsByDoc };
}

// 由批量分组 map 组装单文档完整 DTO
function toDocumentDTO(doc: DocRow, batch: ReturnType<typeof loadDocumentBatch>): DocumentDTO {
  const questions = (batch.questionsByDoc.get(doc.id) ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    order: q.sort_order,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
    isDeleted: q.is_deleted,
    deletedAt: q.deleted_at,
  }));
  const questionIds = new Set(questions.map((q) => q.id));
  const answers = questions
    .flatMap((q) =>
      (batch.answersByQuestion.get(q.id) ?? []).map((a) => ({
        id: a.id,
        questionId: a.question_id,
        content: a.content,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
    )
    .filter((a) => questionIds.has(a.questionId));
  const tags = (batch.tagsByDoc.get(doc.id) ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
  }));
  return {
    id: doc.id,
    title: doc.title,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    deletedAt: doc.deleted_at,
    questions,
    answers,
    tags,
  };
}

// Document IPC handlers
ipcMain.handle("document:findAllDocuments", (_, options?: { isDeleted?: boolean }) => {
  const database = getDatabase();
  const batch = loadDocumentBatch(database, options?.isDeleted);
  return batch.docs.map((doc) => toDocumentDTO(doc, batch));
});

// 列表摘要 IPC：不携带 answers/questions 长文本，仅供文档列表加载使用（性能优化 A 档）
ipcMain.handle("document:listDocuments", (_, options?: { isDeleted?: boolean }) => {
  const database = getDatabase();
  const batch = loadDocumentBatch(database, options?.isDeleted);
  return batch.docs.map((doc) => {
    const questions = batch.questionsByDoc.get(doc.id) ?? [];
    return {
      id: doc.id,
      title: doc.title,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      questionCount: questions.filter((q) => !q.is_deleted).length,
      tags: (batch.tagsByDoc.get(doc.id) ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.created_at,
      })),
    };
  });
});

// 文档详情缓存：以 documents.updated_at 作指纹，未变更时免于重复组装查询（性能优化 C 档）
const documentDetailCache = new Map<string, { updatedAt: string; data: DocumentDTO }>();

ipcMain.handle("document:findDocumentById", (_, id: string) => {
  const database = getDatabase();
  const row = database.prepare("SELECT updated_at FROM documents WHERE id = ?").get(id) as
    | { updated_at: string }
    | undefined;
  if (!row) {
    return null;
  }

  const hit = documentDetailCache.get(id);
  if (hit && hit.updatedAt === row.updated_at) {
    return hit.data;
  }

  const doc = database.prepare("SELECT * FROM documents WHERE id = ?").get(id) as unknown as DocRow;
  const questions = database
    .prepare("SELECT * FROM questions WHERE document_id = ? ORDER BY sort_order")
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

  const data: DocumentDTO = {
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
  documentDetailCache.set(id, { updatedAt: row.updated_at, data });
  return data;
});

ipcMain.handle("document:softDeleteDocument", (_, id: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database.prepare("UPDATE documents SET is_deleted = 1, deleted_at = ? WHERE id = ?").run(now, id);
  SearchService.deleteDocument(database, id);
});

ipcMain.handle("document:restoreDocument", (_, id: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare("UPDATE documents SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?")
    .run(now, id);
  SearchService.updateDocument(database, id);
});

ipcMain.handle("document:existsDocument", (_, id: string) => {
  const database = getDatabase();
  const row = database
    .prepare("SELECT 1 FROM documents WHERE id = ? AND is_deleted = 0")
    .get(id) as ExistsRow | undefined;
  return !!row;
});

// Answer IPC handlers
ipcMain.handle("answer:findAnswerByQuestionId", (_, questionId: string) => {
  const database = getDatabase();
  const answer = database.prepare("SELECT * FROM answers WHERE question_id = ?").get(questionId) as
    | AnswerRow
    | undefined;
  if (!answer) return null;
  return {
    id: answer.id,
    questionId: answer.question_id,
    content: answer.content,
    createdAt: answer.created_at,
    updatedAt: answer.updated_at,
  };
});

ipcMain.handle("answer:saveAnswer", (_, answerJson: string) => {
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

ipcMain.handle("answer:deleteAnswer", (_, id: string) => {
  const database = getDatabase();
  database.prepare("DELETE FROM answers WHERE id = ?").run(id);
});

// Question IPC handlers (soft delete)
ipcMain.handle("question:softDeleteQuestion", (_, documentId: string, questionId: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare("UPDATE questions SET is_deleted = 1, deleted_at = ? WHERE id = ? AND document_id = ?")
    .run(now, questionId, documentId);
});

ipcMain.handle("question:restoreQuestion", (_, documentId: string, questionId: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare(
      "UPDATE questions SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ? AND document_id = ?",
    )
    .run(now, questionId, documentId);
});

ipcMain.handle("question:getDeletedQuestions", (_, documentId: string) => {
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

ipcMain.handle("question:clearDeletedQuestions", (_, documentId: string) => {
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
  database
    .prepare("DELETE FROM questions WHERE document_id = ? AND is_deleted = 1")
    .run(documentId);
});

ipcMain.handle(
  "question:moveQuestionToDocument",
  (_, questionId: string, targetDocumentId: string) => {
    const database = getDatabase();

    // 获取目标文档的问题数量，用于设置新问题的 order
    const result = database
      .prepare("SELECT COUNT(*) as count FROM questions WHERE document_id = ? AND is_deleted = 0")
      .get(targetDocumentId) as { count: number };
    const newOrder = result.count;

    // 更新问题的 document_id 和 order
    database
      .prepare(
        "UPDATE questions SET document_id = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(targetDocumentId, newOrder, questionId);
  },
);

// Tag IPC handlers
ipcMain.handle("tag:findAllTags", () => {
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

ipcMain.handle("tag:findTagById", (_, id: string) => {
  const database = getDatabase();
  const tag = database.prepare("SELECT * FROM tags WHERE id = ?").get(id) as TagRow | undefined;
  if (!tag) return null;
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.created_at,
  };
});

ipcMain.handle("tag:findTagByName", (_, name: string) => {
  const database = getDatabase();
  const tag = database.prepare("SELECT * FROM tags WHERE name = ?").get(name) as TagRow | undefined;
  if (!tag) return null;
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.created_at,
  };
});

ipcMain.handle("tag:saveTag", (_, tagJson: string) => {
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

ipcMain.handle("tag:deleteTag", (_, id: string) => {
  const database = getDatabase();
  database.prepare("DELETE FROM tags WHERE id = ?").run(id);
  SearchService.deleteTag(database, id);
});

ipcMain.handle("tag:existsTag", (_, name: string) => {
  const database = getDatabase();
  const row = database.prepare("SELECT 1 FROM tags WHERE name = ?").get(name) as
    | ExistsRow
    | undefined;
  return !!row;
});

ipcMain.handle("tag:addTagToDocument", (_, documentId: string, tagId: string) => {
  const database = getDatabase();
  database
    .prepare("INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING")
    .run(documentId, tagId);
  SearchService.updateTag(database, tagId);
  SearchService.updateDocument(database, documentId);
});

ipcMain.handle("tag:removeTagFromDocument", (_, documentId: string, tagId: string) => {
  const database = getDatabase();
  database
    .prepare("DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?")
    .run(documentId, tagId);
  SearchService.updateTag(database, tagId);
  SearchService.updateDocument(database, documentId);
});

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
      .prepare("SELECT * FROM questions WHERE document_id = ? ORDER BY sort_order")
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
ipcMain.handle("search:querySearchRegex", async (_, query: string) => {
  const database = getDatabase();
  const searchService = new SearchService(database);
  return await searchService.querySearchRegex(query);
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

ipcMain.handle("document:saveDocument", (_, doc: DocumentInput) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare(
      "INSERT INTO documents (id, title, created_at, updated_at, is_deleted, deleted_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at",
    )
    .run(doc.id, doc.title, doc.createdAt ?? now, doc.updatedAt ?? now, 0, null);
  SearchService.updateDocument(database, doc.id);
});

ipcMain.handle("document:deleteDocument", (_, id: string) => {
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

ipcMain.handle("question:saveAllQuestions", (_, docId: string, questions: QuestionInput[]) => {
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
});

ipcMain.handle("question:deleteAllQuestions", (_, ids: string[]) => {
  const database = getDatabase();
  for (const id of ids) {
    SearchService.deleteQuestion(database, id);
    database.prepare("DELETE FROM answers WHERE question_id = ?").run(id);
    database.prepare("DELETE FROM questions WHERE id = ?").run(id);
  }
});

ipcMain.handle("answer:saveAllAnswers", (_, docId: string, answers: AnswerInput[]) => {
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
      .run(a.id, a.questionId, a.content, a.createdAt ?? now, a.updatedAt ?? now);
    SearchService.updateAnswer(database, a.id);
  }
});

ipcMain.handle("answer:deleteAllAnswers", (_, ids: string[]) => {
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: getAppIconPath(),
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

  // 拦截关闭：非退出操作时最小化到托盘
  win.on("close", (e) => {
    if (tray && !isQuitting) {
      e.preventDefault();
      win.hide();
      return;
    }
  });

  win.on("closed", () => {
    // BrowserWindow 实例会在关闭后自动释放，无需额外处理
  });

  return win;
}

/** 显示主窗口（从托盘恢复） */
function showMainWindow() {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.focus();
  }
}

/** 托盘点击：窗口可见则隐藏，否则显示 */
function toggleMainWindow() {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) {
    createWindow();
    return;
  }
  if (win.isVisible() && !win.isMinimized()) {
    win.hide();
    return;
  }
  showMainWindow();
}

/** 创建系统托盘：左键显示窗口，右键菜单含显示/退出 */
function createTray() {
  if (tray) {
    return;
  }
  tray = new Tray(nativeImage.createFromPath(getAppIconPath()));
  tray.setToolTip("Chat Manager");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "显示主窗口", click: showMainWindow },
      {
        label: "重启",
        click: () => {
          isQuitting = true;
          app.relaunch();
          app.quit();
        },
      },
      {
        label: "退出",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", toggleMainWindow);
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "新建窗口",
          accelerator: "CmdOrCtrl+N",
          click: createWindow,
        },
        {
          label: "设置",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              window.webContents.send("open-settings");
            } else {
              log.error("Window is null, cannot send open-settings");
            }
          },
        },
        { type: "separator" },
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
          label: "重建索引",
          click: async () => {
            await SearchService.rebuildIndex(getDatabase());
            const window = BrowserWindow.getFocusedWindow();
            window?.webContents.send("show-toast", "索引重建完成");
          },
        },
        { type: "separator" },
        {
          label: "退出",
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
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
  if (!IS_E2E) {
    createTray();
  }

  // 检查是否需要重建索引（首次安装或索引为空时）
  const countResult = db.prepare("SELECT COUNT(*) as count FROM search_fts").get() as {
    count: number;
  };
  if (countResult.count === 0) {
    log.info("Search index is empty, rebuilding...");
    SearchService.rebuildIndex(db)
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
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && (!tray || isQuitting)) {
    app.quit();
  }
});
