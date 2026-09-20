import type { DatabaseSync as SqliteDB } from "node:sqlite";
import type { SearchResults } from "../src/types/search";

// 复杂正则搜索的纯函数实现：与 db、类实例解耦，主进程与 worker 线程共用同一份逻辑。
// worker 无法传输 DatabaseSync 句柄，必须由调用方传入已打开/新建的连接。

// 文本片段必须先转义 HTML：回答内容常含 <script>、<template> 等代码，若直接拼入 v-html 会被当作真实标签解析，
// 导致 <mark> 高亮被吞进标签内部不可见。
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 正则命中片段：以匹配行为中心取上下各1行（共3行），行内按字符半径截取。
// 卡片式展示只显示3行，行数在 snippet 生成阶段就锁定，避免渲染层 line-clamp 与 pre-line 冲突。
function makeSnippet(text: string, match: RegExpMatchArray): string {
  const index = match.index ?? 0;
  const matched = match[0];
  const radius = 50;
  const lines = text.split("\n");

  // 定位匹配覆盖的行范围 [startLine, endLine]（匹配可能跨多行）
  let charCount = 0;
  let startLine = 0;
  let endLine = 0;
  let startLineFound = false;
  for (let i = 0; i < lines.length; i++) {
    const lineLen = (lines[i]?.length ?? 0) + 1; // +1 为换行符
    if (!startLineFound && index >= charCount && index < charCount + lineLen) {
      startLine = i;
      startLineFound = true;
    }
    if (startLineFound && index + matched.length <= charCount + lineLen) {
      endLine = i;
      break;
    }
    charCount += lineLen;
  }
  if (endLine < startLine) endLine = startLine;

  // 上下各扩1行，卡片最多展示3行
  const viewStart = Math.max(0, startLine - 1);
  const viewEnd = Math.min(lines.length - 1, endLine + 1);

  const rendered: string[] = [];
  for (let i = viewStart; i <= viewEnd; i++) {
    const line = lines[i] ?? "";
    if (i >= startLine && i <= endLine) {
      // 匹配行：以匹配段为中心截取，保证 <mark> 完整
      let lineStartOffset = 0;
      for (let j = 0; j < i; j++) lineStartOffset += (lines[j]?.length ?? 0) + 1;
      const localStart = Math.max(0, index - lineStartOffset);
      const localEnd = Math.min(line.length, index + matched.length - lineStartOffset);
      const segStart = Math.max(0, localStart - radius);
      const segEnd = Math.min(line.length, localEnd + radius);
      const prefix = segStart > 0 ? "..." : "";
      const suffix = segEnd < line.length ? "..." : "";
      rendered.push(
        `${prefix}${escapeHtml(line.slice(segStart, localStart))}<mark>${escapeHtml(line.slice(localStart, localEnd))}</mark>${escapeHtml(line.slice(localEnd, segEnd))}${suffix}`,
      );
    } else {
      // 上下文行：截取前 radius*2 字符，过长加省略号
      const segEnd = Math.min(line.length, radius * 2);
      const suffix = segEnd < line.length ? "..." : "";
      rendered.push(`${escapeHtml(line.slice(0, segEnd))}${suffix}`);
    }
  }

  const head = viewStart > 0 ? "...\n" : "";
  const tail = viewEnd < lines.length - 1 ? "\n..." : "";
  return `${head}${rendered.join("\n")}${tail}`;
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
