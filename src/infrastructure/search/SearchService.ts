import type { DatabaseSync as SqliteDB } from "node:sqlite";
import type { SearchResults } from "../../types/search";
import { searchRegexFromDb } from "../../../electron/regexSearch";

interface FtsRow {
  id: string;
  type: string;
  content: string;
  metadata: string;
}

const segmenter = new Intl.Segmenter("zh", {
  granularity: "word",
});

function segmentText(text: string): string {
  const words: string[] = [];
  for (const segment of segmenter.segment(text)) {
    if (segment.isWordLike) {
      words.push(segment.segment);
    }
  }
  return words.join(" ");
}

// 搜索结果缓存：查询本身只读索引，重复输入无需重复计算；索引变化时由写方法清空。
// 键需带上 db 身份与 limit：避免不同数据库连接（如单测各自的内存库）互相污染，也避免 limit 不同命中错误缓存
const searchCache = new Map<string, SearchResults>();

// 为每个数据库连接分配稳定递增 id，用于区分不同 db 的缓存空间
const dbIds = new WeakMap<SqliteDB, number>();
let nextDbId = 0;

function dbIdOf(db: SqliteDB): number {
  let id = dbIds.get(db);
  if (id === undefined) {
    id = ++nextDbId;
    dbIds.set(db, id);
  }
  return id;
}

function invalidateSearchCache(): void {
  searchCache.clear();
}

// 正则检索时判定是否为纯字面量（不含正则元字符），是则改走子串匹配，避免正则引擎全表扫描
function isLiteralPattern(pattern: string): boolean {
  return !/[\\^$.|?*+(){}[\]]/.test(pattern);
}

export class SearchService {
  constructor(private db: SqliteDB) {}

  // 增量更新：更新单个文档的索引
  static updateDocument(db: SqliteDB, docId: string): void {
    invalidateSearchCache();
    db.prepare("DELETE FROM search_fts WHERE id = ? AND type = 'document'").run(docId);

    const doc = db
      .prepare(`
      SELECT d.id, d.title,
        (SELECT COUNT(*) FROM questions WHERE document_id = d.id) as questionCount,
        (SELECT COUNT(*) FROM answers a JOIN questions q ON a.question_id = q.id WHERE q.document_id = d.id) as answerCount
      FROM documents d
      WHERE d.id = ? AND d.is_deleted = 0
    `)
      .get(docId) as
      | {
          id: string;
          title: string;
          questionCount: number;
          answerCount: number;
        }
      | undefined;

    if (doc) {
      db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        doc.id,
        "document",
        segmentText(doc.title),
        JSON.stringify({
          title: doc.title,
          questionCount: doc.questionCount,
          answerCount: doc.answerCount,
        }),
      );
    }
  }

  // 增量更新：删除文档的索引
  static deleteDocument(db: SqliteDB, docId: string): void {
    invalidateSearchCache();
    db.prepare("DELETE FROM search_fts WHERE id = ? AND type = 'document'").run(docId);
    // 同时删除关联的问题和答案索引
    const questionIds = db
      .prepare("SELECT id FROM questions WHERE document_id = ?")
      .all(docId) as Array<{ id: string }>;
    for (const { id } of questionIds) {
      SearchService.deleteQuestion(db, id);
    }
  }

  // 增量更新：更新单个问题的索引
  static updateQuestion(db: SqliteDB, questionId: string): void {
    invalidateSearchCache();
    db.prepare("DELETE FROM search_fts WHERE id = ? AND type = 'question'").run(questionId);

    const q = db
      .prepare(`
      SELECT q.id, q.text, q.document_id, d.title as documentTitle
      FROM questions q
      JOIN documents d ON q.document_id = d.id
      WHERE q.id = ? AND q.is_deleted = 0 AND d.is_deleted = 0
    `)
      .get(questionId) as
      | {
          id: string;
          text: string;
          document_id: string;
          documentTitle: string;
        }
      | undefined;

    if (q) {
      db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        q.id,
        "question",
        segmentText(q.text),
        JSON.stringify({
          questionId: q.id,
          documentId: q.document_id,
          documentTitle: q.documentTitle,
        }),
      );
    }
  }

  // 增量更新：删除问题的索引
  static deleteQuestion(db: SqliteDB, questionId: string): void {
    invalidateSearchCache();
    db.prepare("DELETE FROM search_fts WHERE id = ? AND type = 'question'").run(questionId);
    // 同时删除关联的答案索引
    const answerIds = db
      .prepare("SELECT id FROM answers WHERE question_id = ?")
      .all(questionId) as Array<{ id: string }>;
    for (const { id } of answerIds) {
      SearchService.deleteAnswer(db, id);
    }
  }

  // 增量更新：更新单个答案的索引
  static updateAnswer(db: SqliteDB, answerId: string): void {
    invalidateSearchCache();
    db.prepare("DELETE FROM search_fts WHERE id = ? AND type = 'answer'").run(answerId);

    const a = db
      .prepare(`
      SELECT a.id, a.content, a.question_id, q.text as questionText, d.id as documentId, d.title as documentTitle
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      JOIN documents d ON q.document_id = d.id
      WHERE a.id = ? AND q.is_deleted = 0 AND d.is_deleted = 0
    `)
      .get(answerId) as
      | {
          id: string;
          content: string;
          question_id: string;
          questionText: string;
          documentId: string;
          documentTitle: string;
        }
      | undefined;

    if (a) {
      db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        a.id,
        "answer",
        segmentText(a.content),
        JSON.stringify({
          answerId: a.id,
          questionId: a.question_id,
          questionText: a.questionText,
          documentId: a.documentId,
          documentTitle: a.documentTitle,
        }),
      );
    }
  }

  // 增量更新：删除答案的索引
  static deleteAnswer(db: SqliteDB, answerId: string): void {
    invalidateSearchCache();
    db.prepare("DELETE FROM search_fts WHERE id = ? AND type = 'answer'").run(answerId);
  }

  // 增量更新：删除标签的索引
  static deleteTag(db: SqliteDB, tagId: string): void {
    invalidateSearchCache();
    db.prepare("DELETE FROM search_fts WHERE id = ? AND type = 'tag'").run(tagId);
  }

  // 增量更新：更新单个标签的索引
  static updateTag(db: SqliteDB, tagId: string): void {
    invalidateSearchCache();
    db.prepare("DELETE FROM search_fts WHERE id = ? AND type = 'tag'").run(tagId);

    const t = db
      .prepare(`
      SELECT t.id, t.name, (SELECT COUNT(*) FROM document_tags WHERE tag_id = t.id) as documentCount
      FROM tags t
      WHERE t.id = ?
    `)
      .get(tagId) as
      | {
          id: string;
          name: string;
          documentCount: number;
        }
      | undefined;

    if (t) {
      db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        t.id,
        "tag",
        segmentText(t.name),
        JSON.stringify({
          tagName: t.name,
          documentCount: t.documentCount,
        }),
      );
    }
  }

  async querySearch(searchText: string, limit = 10): Promise<SearchResults> {
    if (!searchText || searchText.trim().length === 0) {
      return {
        documents: [],
        questions: [],
        answers: [],
        tags: [],
      };
    }

    const segmented = segmentText(searchText);
    if (!segmented.trim()) {
      return {
        documents: [],
        questions: [],
        answers: [],
        tags: [],
      };
    }

    const cacheKey = `s:${dbIdOf(this.db)}:${searchText}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const escapedQuery = this.escapeQuery(segmented);
    const ftsQuery = escapedQuery
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `"${t}"*`)
      .join(" ");

    const rows = this.db
      .prepare(`
      SELECT id, type, content, metadata,
             snippet(search_fts, 2, '<mark>', '</mark>', '...', 32) as snippet
      FROM search_fts
      WHERE search_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `)
      .all(ftsQuery, limit * 4) as unknown as (FtsRow & {
      snippet?: string;
    })[];

    const result = this.groupByType(rows, limit, escapedQuery);
    searchCache.set(cacheKey, result);
    return result;
  }

  // 正则搜索：直接扫描业务表原文（不走 FTS5 索引），覆盖文档/问题/回答/标签全部字段；
  // 用于搜索特定前缀或含符号的精确片段（如 ^//\s+、TODO(?!:)），FTS5 分词无法表达这类结构
  async querySearchRegex(
    searchText: string,
    limit = 10,
    complexExecutor?: (searchText: string, limit: number) => Promise<SearchResults>,
  ): Promise<SearchResults> {
    if (!searchText || searchText.trim().length === 0) {
      return {
        documents: [],
        questions: [],
        answers: [],
        tags: [],
      };
    }

    const cacheKey = `r:${dbIdOf(this.db)}:${searchText}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 纯字面量（无正则元字符）无需正则引擎，改由 SQL 子串匹配过滤，
    // 避免全表读取后逐个 match，并让数据库层直接 LIMIT
    if (isLiteralPattern(searchText)) {
      const result = this.searchLiteral(searchText, limit);
      searchCache.set(cacheKey, result);
      return result;
    }

    // 复杂正则：优先用注入的执行器（如 worker 线程）避免阻塞主进程；
    // 未注入时回退同步调用共享纯函数（主进程与 worker 复用同一实现），
    // 非法正则的错误消息由该纯函数统一抛出
    const results = complexExecutor
      ? await complexExecutor(searchText, limit)
      : searchRegexFromDb(this.db, searchText, limit);

    searchCache.set(cacheKey, results);
    return results;
  }

  // 字面量子串匹配：按表用 SQL INSTR 过滤并 LIMIT，命中行生成 <mark> 片段，
  // 替代“拉全表 + 逐个 regex 匹配”，可大幅缩小扫描范围并借数据库层截断结果
  private searchLiteral(pattern: string, limit: number): SearchResults {
    const needle = pattern.toLowerCase();
    const results: SearchResults = {
      documents: [],
      questions: [],
      answers: [],
      tags: [],
    };

    const docs = this.db
      .prepare(`
        SELECT d.id, d.title,
          (SELECT COUNT(*) FROM questions WHERE document_id = d.id AND is_deleted = 0) as questionCount,
          (SELECT COUNT(*) FROM answers a JOIN questions q ON a.question_id = q.id WHERE q.document_id = d.id) as answerCount
        FROM documents d
        WHERE d.is_deleted = 0 AND INSTR(LOWER(d.title), ?) > 0
        LIMIT ?
      `)
      .all(needle, limit) as Array<{
      id: string;
      title: string;
      questionCount: number;
      answerCount: number;
    }>;
    for (const row of docs) {
      results.documents.push({
        id: row.id,
        title: row.title,
        questionCount: row.questionCount,
        answerCount: row.answerCount,
      });
    }

    const questions = this.db
      .prepare(`
        SELECT q.id, q.text, q.document_id as documentId, d.title as documentTitle
        FROM questions q
        JOIN documents d ON q.document_id = d.id
        WHERE q.is_deleted = 0 AND d.is_deleted = 0 AND INSTR(LOWER(q.text), ?) > 0
        LIMIT ?
      `)
      .all(needle, limit) as Array<{
      id: string;
      text: string;
      documentId: string;
      documentTitle: string;
    }>;
    for (const row of questions) {
      results.questions.push({
        id: row.id,
        text: row.text,
        snippet: this.literalSnippet(row.text, pattern),
        documentId: row.documentId,
        documentTitle: row.documentTitle,
      });
    }

    const answers = this.db
      .prepare(`
        SELECT a.id, a.content, a.question_id as questionId, q.text as questionText,
               q.document_id as documentId, d.title as documentTitle
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        JOIN documents d ON q.document_id = d.id
        WHERE q.is_deleted = 0 AND d.is_deleted = 0 AND INSTR(LOWER(a.content), ?) > 0
        LIMIT ?
      `)
      .all(needle, limit) as Array<{
      id: string;
      content: string;
      questionId: string;
      questionText: string;
      documentId: string;
      documentTitle: string;
    }>;
    for (const row of answers) {
      results.answers.push({
        id: row.id,
        content: row.content,
        snippet: this.literalSnippet(row.content, pattern),
        questionText: row.questionText,
        questionId: row.questionId,
        documentId: row.documentId,
        documentTitle: row.documentTitle,
      });
    }

    const tags = this.db
      .prepare(`
        SELECT t.id, t.name, (SELECT COUNT(*) FROM document_tags WHERE tag_id = t.id) as documentCount
        FROM tags t
        WHERE INSTR(LOWER(t.name), ?) > 0
        LIMIT ?
      `)
      .all(needle, limit) as Array<{ id: string; name: string; documentCount: number }>;
    for (const row of tags) {
      results.tags.push({ id: row.id, name: row.name, documentCount: row.documentCount });
    }

    return results;
  }

  // 以命中的子串为中心截取上下文并包 <mark>，与 regexSearch.makeSnippet 输出格式一致
  private literalSnippet(text: string, pattern: string): string {
    const index = text.toLowerCase().indexOf(pattern.toLowerCase());
    if (index === -1) {
      return text.slice(0, 80) + (text.length > 80 ? "..." : "");
    }
    const matched = text.slice(index, index + pattern.length);
    const radius = 50;
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + matched.length + radius);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < text.length ? "..." : "";
    return `${prefix}${text.slice(start, index)}<mark>${matched}</mark>${text.slice(index + matched.length, end)}${suffix}`;
  }

  private escapeQuery(query: string): string {
    return query.replace(/["*]/g, "").trim();
  }

  private groupByType(
    rows: (FtsRow & { snippet?: string })[],
    limit: number,
    escapedQuery?: string,
  ): SearchResults {
    const results: SearchResults = {
      documents: [],
      questions: [],
      answers: [],
      tags: [],
    };

    for (const row of rows) {
      const metadata = JSON.parse(row.metadata || "{}");

      switch (row.type) {
        case "document":
          if (results.documents.length < limit) {
            results.documents.push({
              id: row.id,
              title: row.content,
              questionCount: metadata.questionCount || 0,
              answerCount: metadata.answerCount || 0,
            });
          }
          break;
        case "question":
          if (results.questions.length < limit) {
            results.questions.push({
              id: row.id,
              text: row.content,
              snippet: row.snippet || row.content,
              documentId: metadata.documentId || "",
              documentTitle: metadata.documentTitle || "",
            });
          }
          break;
        case "answer":
          if (results.answers.length < limit) {
            results.answers.push({
              id: row.id,
              content: row.content,
              snippet:
                row.snippet ||
                (escapedQuery
                  ? this.extractSnippet(row.content, escapedQuery)
                  : row.content.slice(0, 80)),
              questionText: metadata.questionText || "",
              questionId: metadata.questionId || "",
              documentId: metadata.documentId || "",
              documentTitle: metadata.documentTitle || "",
            });
          }
          break;
        case "tag":
          if (results.tags.length < limit) {
            results.tags.push({
              id: row.id,
              name: row.content,
              documentCount: metadata.documentCount || 0,
            });
          }
          break;
      }
    }

    return results;
  }

  private extractSnippet(text: string, keywords: string): string {
    const keywordList = keywords.split(/\s+/).filter(Boolean);
    if (keywordList.length === 0) {
      return text.slice(0, 80) + (text.length > 80 ? "..." : "");
    }

    const firstKeyword = keywordList[0]?.toLowerCase();
    if (!firstKeyword) {
      return text.slice(0, 80) + (text.length > 80 ? "..." : "");
    }

    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(firstKeyword);

    if (index === -1) {
      return text.slice(0, 80) + (text.length > 80 ? "..." : "");
    }

    const contextRadius = 50;
    const start = Math.max(0, index - contextRadius);
    const end = Math.min(text.length, index + firstKeyword.length + contextRadius);

    let snippet = text.slice(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < text.length) snippet += "...";

    return snippet;
  }

  static async rebuildIndex(db: SqliteDB): Promise<void> {
    invalidateSearchCache();
    db.exec("DELETE FROM search_fts");

    const docs = db
      .prepare(`
      SELECT d.id, d.title,
        (SELECT COUNT(*) FROM questions WHERE document_id = d.id) as questionCount,
        (SELECT COUNT(*) FROM answers a JOIN questions q ON a.question_id = q.id WHERE q.document_id = d.id) as answerCount
      FROM documents d
      WHERE d.is_deleted = 0
    `)
      .all() as Array<{
      id: string;
      title: string;
      questionCount: number;
      answerCount: number;
    }>;

    for (const doc of docs) {
      db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        doc.id,
        "document",
        segmentText(doc.title),
        JSON.stringify({
          title: doc.title,
          questionCount: doc.questionCount,
          answerCount: doc.answerCount,
        }),
      );
    }

    const questions = db
      .prepare(`
      SELECT q.id, q.text, q.document_id, d.title as documentTitle
      FROM questions q
      JOIN documents d ON q.document_id = d.id
      WHERE q.is_deleted = 0 AND d.is_deleted = 0
    `)
      .all() as Array<{
      id: string;
      text: string;
      document_id: string;
      documentTitle: string;
    }>;

    for (const q of questions) {
      db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        q.id,
        "question",
        segmentText(q.text),
        JSON.stringify({
          questionId: q.id,
          documentId: q.document_id,
          documentTitle: q.documentTitle,
        }),
      );
    }

    const answers = db
      .prepare(`
      SELECT a.id, a.content, a.question_id, q.text as questionText, d.id as documentId, d.title as documentTitle
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      JOIN documents d ON q.document_id = d.id
      WHERE q.is_deleted = 0 AND d.is_deleted = 0
    `)
      .all() as Array<{
      id: string;
      content: string;
      question_id: string;
      questionText: string;
      documentId: string;
      documentTitle: string;
    }>;

    for (const a of answers) {
      db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        a.id,
        "answer",
        segmentText(a.content),
        JSON.stringify({
          answerId: a.id,
          questionId: a.question_id,
          questionText: a.questionText,
          documentId: a.documentId,
          documentTitle: a.documentTitle,
        }),
      );
    }

    const tags = db
      .prepare(`
      SELECT t.id, t.name, (SELECT COUNT(*) FROM document_tags WHERE tag_id = t.id) as documentCount
      FROM tags t
    `)
      .all() as Array<{
      id: string;
      name: string;
      documentCount: number;
    }>;

    for (const t of tags) {
      db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        t.id,
        "tag",
        segmentText(t.name),
        JSON.stringify({
          tagName: t.name,
          documentCount: t.documentCount,
        }),
      );
    }
  }
}
