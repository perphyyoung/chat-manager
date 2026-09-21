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
import { Worker } from "node:worker_threads";
import { log } from "./logger";
import { getDatabase, closeDatabase, getDbPath } from "./database";
import { SearchService } from "../src/infrastructure/search/SearchService";
import type { SearchResults } from "../src/types/search";
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

// e2e 环境（多 worker 并发多实例）：为每个实例隔离 Electron userData 目录，
// 否则单实例锁按默认 userData 命中，后启动实例 quit、已有实例反复 createWindow → 窗口错乱。
// 必须在 requestSingleInstanceLock() 之前调用才能影响锁的 key。
if (IS_E2E && process.env.E2E_INSTANCE) {
  app.setPath("userData", path.join(dataDirManager.getDbDir(), "_userData"));
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

// 列表摘要 IPC：不携带 answers/questions 长文本，仅供文档列表加载使用
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

// 文档详情缓存：以 documents.updated_at 作指纹，文档未变更时免于重复组装查询
const documentDetailCache = new Map<string, { updatedAt: string; data: DocumentDTO }>();

// 详情缓存正确性不能依赖 updated_at 指纹（子数据写操作未必刷新它），
// 写操作后需显式失效：能确定文档删单条，否则清空，避免命中旧数据
function invalidateDocumentDetailCache(documentId?: string): void {
  if (documentId) {
    documentDetailCache.delete(documentId);
  } else {
    documentDetailCache.clear();
  }
}

// 子数据（问题/回答/标签关联）被修改时，文档内容确实变了，同步刷新 updated_at，
// 使“按更新时间排序”反映真实变更，与 saveDocument/restoreDocument 的语义一致
function touchDocument(database: DatabaseType, documentId: string): void {
  database
    .prepare("UPDATE documents SET updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), documentId);
}

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
  touchDocument(database, id);
  invalidateDocumentDetailCache(id);
  SearchService.deleteDocument(database, id);
});

ipcMain.handle("document:restoreDocument", (_, id: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare("UPDATE documents SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?")
    .run(now, id);
  invalidateDocumentDetailCache(id);
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
  // 回答属问题，反查其所属文档并刷新 updated_at
  const ownedDoc = database
    .prepare("SELECT document_id FROM questions WHERE id = ?")
    .get(answer.questionId) as { document_id: string } | undefined;
  if (ownedDoc) {
    touchDocument(database, ownedDoc.document_id);
    invalidateDocumentDetailCache(ownedDoc.document_id);
  }
  SearchService.updateAnswer(database, answer.id);
});

ipcMain.handle("answer:deleteAnswer", (_, id: string) => {
  const database = getDatabase();
  // 删除前反查所属文档用于刷新 updated_at
  const ownedDoc = database
    .prepare(
      "SELECT document_id FROM questions WHERE id = (SELECT question_id FROM answers WHERE id = ?)",
    )
    .get(id) as { document_id: string } | undefined;
  database.prepare("DELETE FROM answers WHERE id = ?").run(id);
  if (ownedDoc) {
    touchDocument(database, ownedDoc.document_id);
    invalidateDocumentDetailCache(ownedDoc.document_id);
  }
});

// Question IPC handlers (soft delete)
ipcMain.handle("question:softDeleteQuestion", (_, documentId: string, questionId: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare("UPDATE questions SET is_deleted = 1, deleted_at = ? WHERE id = ? AND document_id = ?")
    .run(now, questionId, documentId);
  touchDocument(database, documentId);
  invalidateDocumentDetailCache(documentId);
});

ipcMain.handle("question:restoreQuestion", (_, documentId: string, questionId: string) => {
  const database = getDatabase();
  const now = new Date().toISOString();
  database
    .prepare(
      "UPDATE questions SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ? AND document_id = ?",
    )
    .run(now, questionId, documentId);
  touchDocument(database, documentId);
  invalidateDocumentDetailCache(documentId);
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
  touchDocument(database, documentId);
  invalidateDocumentDetailCache(documentId);
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

    // 更新前先反查源文档（更新后 document_id 已变为目标，无法再定位源）
    const sourceDoc = database
      .prepare("SELECT document_id FROM questions WHERE id = ?")
      .get(questionId) as { document_id: string } | undefined;

    // 更新问题的 document_id 和 order
    database
      .prepare(
        "UPDATE questions SET document_id = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(targetDocumentId, newOrder, questionId);
    if (sourceDoc) {
      touchDocument(database, sourceDoc.document_id);
    }
    touchDocument(database, targetDocumentId);
    invalidateDocumentDetailCache();
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
  // 标签改名影响所有关联文档，清空详情缓存以确保重新组装
  invalidateDocumentDetailCache();
  SearchService.updateTag(database, tag.id);
});

ipcMain.handle("tag:deleteTag", (_, id: string) => {
  const database = getDatabase();
  database.prepare("DELETE FROM tags WHERE id = ?").run(id);
  invalidateDocumentDetailCache();
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
  touchDocument(database, documentId);
  invalidateDocumentDetailCache(documentId);
  SearchService.updateTag(database, tagId);
  SearchService.updateDocument(database, documentId);
});

ipcMain.handle("tag:removeTagFromDocument", (_, documentId: string, tagId: string) => {
  const database = getDatabase();
  database
    .prepare("DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?")
    .run(documentId, tagId);
  touchDocument(database, documentId);
  invalidateDocumentDetailCache(documentId);
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

// 正则搜索 worker：惰性单例，请求用 requestId 配对响应，超时或异常时回退同步
let regexWorker: Worker | null = null;
let nextRegexRequestId = 0;
const pendingRegexRequests = new Map<
  string,
  {
    resolve: (results: SearchResults) => void;
    reject: (err: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();
const REGEX_WORKER_TIMEOUT = 30_000;

function getRegexWorker(): Worker {
  if (!regexWorker) {
    // electron-vite 构建后 searchWorker.js 与 index.js 同目录（out/main/）
    const workerPath = path.join(__dirname, "searchWorker.js");
    regexWorker = new Worker(workerPath);

    regexWorker.on(
      "message",
      (msg: { requestId: string; ok: boolean; results?: SearchResults; error?: string }) => {
        const pending = pendingRegexRequests.get(msg.requestId);
        if (!pending) return;
        clearTimeout(pending.timeout);
        pendingRegexRequests.delete(msg.requestId);
        if (msg.ok && msg.results) {
          pending.resolve(msg.results);
        } else {
          pending.reject(new Error(msg.error ?? "regex search worker failed"));
        }
      },
    );

    regexWorker.on("error", (err) => {
      log.error(`[search] regex worker error: ${err instanceof Error ? err.message : String(err)}`);
      for (const [, pending] of pendingRegexRequests) {
        clearTimeout(pending.timeout);
        pending.reject(err);
      }
      pendingRegexRequests.clear();
      regexWorker = null;
    });

    regexWorker.on("exit", () => {
      regexWorker = null;
    });
  }
  return regexWorker;
}

function runRegexInWorker(searchText: string, limit: number): Promise<SearchResults> {
  return new Promise((resolve, reject) => {
    const worker = getRegexWorker();
    const requestId = String(++nextRegexRequestId);
    const timeout = setTimeout(() => {
      pendingRegexRequests.delete(requestId);
      reject(new Error("regex search worker timeout"));
    }, REGEX_WORKER_TIMEOUT);
    pendingRegexRequests.set(requestId, { resolve, reject, timeout });
    worker.postMessage({ requestId, dbPath: getDbPath(), searchText, limit });
  });
}

ipcMain.handle("search:querySearchRegex", async (_, query: string) => {
  const database = getDatabase();
  const searchService = new SearchService(database);
  try {
    // 字面量由 querySearchRegex 内部走 SQL INSTR，无需 worker；复杂正则注入 worker 执行器
    return await searchService.querySearchRegex(query, 10, (searchText, limit) =>
      runRegexInWorker(searchText, limit),
    );
  } catch (err) {
    log.warn(
      `[search] regex worker failed, fallback to sync: ${err instanceof Error ? err.message : String(err)}`,
    );
    return await searchService.querySearchRegex(query);
  }
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
  invalidateDocumentDetailCache(doc.id);
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
  invalidateDocumentDetailCache(id);
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
  touchDocument(database, docId);
  invalidateDocumentDetailCache(docId);
});

ipcMain.handle("question:deleteAllQuestions", (_, ids: string[]) => {
  const database = getDatabase();
  for (const id of ids) {
    SearchService.deleteQuestion(database, id);
    database.prepare("DELETE FROM answers WHERE question_id = ?").run(id);
    database.prepare("DELETE FROM questions WHERE id = ?").run(id);
  }
  // 无法由问题 id 定位文档，直接清空缓存兜底
  invalidateDocumentDetailCache();
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
  touchDocument(database, docId);
  invalidateDocumentDetailCache(docId);
});

ipcMain.handle("answer:deleteAllAnswers", (_, ids: string[]) => {
  const database = getDatabase();
  for (const id of ids) {
    SearchService.deleteAnswer(database, id);
    database.prepare("DELETE FROM answers WHERE id = ?").run(id);
  }
  invalidateDocumentDetailCache();
});

function openSettings() {
  // 生产用 getFocusedWindow（用户点击菜单时窗口必有焦点）；
  // e2e 多实例并发时系统焦点可能在其他窗口，getFocusedWindow 返回 null，
  // 此时 fallback 到本进程第一个窗口（e2e 单进程仅一个窗口，不会发错）。
  const window =
    BrowserWindow.getFocusedWindow() ?? (IS_E2E ? BrowserWindow.getAllWindows()[0] : undefined);
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
          // applicationMenu 的 click 回调 browserWindow 参数可能为 undefined（应用菜单不属于特定窗口），
          // 统一走 openSettings：getFocusedWindow 拿不到时 fallback 到 getAllWindows()[0]。
          click: () => openSettings(),
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

  // E2E 多 worker 并发多实例时系统级快捷键必然争抢失败，测试也不需要全局快捷键，跳过注册
  if (!IS_E2E) {
    // 应用支持多开（不同数据目录共存），系统级快捷键只能被一个实例持有，
    // 后启动实例注册失败属预期，降级为 warn 而非 error
    const shortcutRegistered = globalShortcut.register("Ctrl+,", openSettings);
    if (!shortcutRegistered) {
      log.warn("Failed to register global shortcut Ctrl+, (多开时，可能已被其他实例占用，属正常)");
    }
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
