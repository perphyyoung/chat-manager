import type { DatabaseSync as SqliteDB } from "node:sqlite";
import type { SearchResults } from "../src/types/search";

// 复杂正则搜索的纯函数实现：与 db、类实例解耦，主进程与 worker 线程共用同一份逻辑。
// worker 无法传输 DatabaseSync 句柄，必须由调用方传入已打开/新建的连接。

// 正则命中片段：以匹配位置为中心截取上下文并包 <mark>，与 FTS5 snippet 输出格式一致
function makeSnippet(text: string, match: RegExpMatchArray): string {
  const index = match.index ?? 0;
  const matched = match[0];
  const radius = 50;
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + matched.length + radius);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, index)}<mark>${matched}</mark>${text.slice(index + matched.length, end)}${suffix}`;
}

/**
 * 对含元字符的正则做全表扫描（不走 FTS5 索引），覆盖文档/问题/回答/标签原文。
 * 同步执行，仅用于复杂正则；字面量走 SQL INSTR，不在本函数范围内。
 * @param db 已打开的只读数据库连接（worker 内自行 new）
 * @param searchText 已验证的正则表达式
 * @param limit 每类结果上限
 */
export function searchRegexFromDb(db: SqliteDB, searchText: string, limit: number): SearchResults {
  let regex: RegExp;
  try {
    regex = new RegExp(searchText, "ium");
  } catch {
    throw new Error(`Invalid regular expression: ${searchText}`);
  }

  const results: SearchResults = {
    documents: [],
    questions: [],
    answers: [],
    tags: [],
  };

  const docRows = db
    .prepare(`
        SELECT d.id, d.title,
          (SELECT COUNT(*) FROM questions WHERE document_id = d.id AND is_deleted = 0) as questionCount,
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
  for (const row of docRows) {
    if (results.documents.length >= limit) break;
    if (row.title.match(regex)) {
      results.documents.push({
        id: row.id,
        title: row.title,
        questionCount: row.questionCount,
        answerCount: row.answerCount,
      });
    }
  }

  const questionRows = db
    .prepare(`
        SELECT q.id, q.text, q.document_id as documentId, d.title as documentTitle
        FROM questions q
        JOIN documents d ON q.document_id = d.id
        WHERE q.is_deleted = 0 AND d.is_deleted = 0
      `)
    .all() as Array<{ id: string; text: string; documentId: string; documentTitle: string }>;
  for (const row of questionRows) {
    if (results.questions.length >= limit) break;
    const match = row.text.match(regex);
    if (match) {
      results.questions.push({
        id: row.id,
        text: row.text,
        snippet: makeSnippet(row.text, match),
        documentId: row.documentId,
        documentTitle: row.documentTitle,
      });
    }
  }

  const answerRows = db
    .prepare(`
        SELECT a.id, a.content, a.question_id as questionId, q.text as questionText,
               q.document_id as documentId, d.title as documentTitle
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        JOIN documents d ON q.document_id = d.id
        WHERE q.is_deleted = 0 AND d.is_deleted = 0
      `)
    .all() as Array<{
    id: string;
    content: string;
    questionId: string;
    questionText: string;
    documentId: string;
    documentTitle: string;
  }>;
  for (const row of answerRows) {
    if (results.answers.length >= limit) break;
    const match = row.content.match(regex);
    if (match) {
      results.answers.push({
        id: row.id,
        content: row.content,
        snippet: makeSnippet(row.content, match),
        questionText: row.questionText,
        questionId: row.questionId,
        documentId: row.documentId,
        documentTitle: row.documentTitle,
      });
    }
  }

  const tagRows = db
    .prepare(`
        SELECT t.id, t.name, (SELECT COUNT(*) FROM document_tags WHERE tag_id = t.id) as documentCount
        FROM tags t
      `)
    .all() as Array<{ id: string; name: string; documentCount: number }>;
  for (const row of tagRows) {
    if (results.tags.length >= limit) break;
    if (row.name.match(regex)) {
      results.tags.push({ id: row.id, name: row.name, documentCount: row.documentCount });
    }
  }

  return results;
}
