import type { DatabaseSync as SqliteDB } from "node:sqlite";

export interface SearchResults {
  documents: DocumentResult[];
  questions: QuestionResult[];
  answers: AnswerResult[];
  tags: TagResult[];
}

export interface DocumentResult {
  id: string;
  title: string;
  questionCount: number;
  answerCount: number;
}

export interface QuestionResult {
  id: string;
  text: string;
  documentId: string;
  documentTitle: string;
}

export interface AnswerResult {
  id: string;
  content: string;
  questionText: string;
  questionId: string;
  documentId: string;
  documentTitle: string;
}

export interface TagResult {
  id: string;
  name: string;
  documentCount: number;
}

interface FtsRow {
  id: string;
  type: string;
  content: string;
  metadata: string;
}

const segmenter = new Intl.Segmenter("zh", { granularity: "word" });

function segmentText(text: string): string {
  const words: string[] = [];
  for (const segment of segmenter.segment(text)) {
    if (segment.isWordLike) {
      words.push(segment.segment);
    }
  }
  return words.join(" ");
}

export class SearchService {
  static dirty = false;

  static markDirty(): void {
    SearchService.dirty = true;
  }

  constructor(private db: SqliteDB) {}

  async query(searchText: string, limit = 10): Promise<SearchResults> {
    if (SearchService.dirty) {
      await this.rebuildIndex();
      SearchService.dirty = false;
    }

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

    const escapedQuery = this.escapeQuery(segmented);
    const ftsQuery = escapedQuery
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `"${t}"*`)
      .join(" ");

    const rows = this.db.prepare(`
      SELECT id, type, content, metadata
      FROM search_fts
      WHERE search_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, limit * 4) as unknown as FtsRow[];

    return this.groupByType(rows, limit);
  }

  private escapeQuery(query: string): string {
    return query.replace(/["*]/g, "").trim();
  }

  private groupByType(rows: FtsRow[], limit: number): SearchResults {
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

  async rebuildIndex(): Promise<void> {
    this.db.exec("DELETE FROM search_fts");

    const docs = this.db.prepare(`
      SELECT d.id, d.title,
        (SELECT COUNT(*) FROM questions WHERE document_id = d.id) as questionCount,
        (SELECT COUNT(*) FROM answers a JOIN questions q ON a.question_id = q.id WHERE q.document_id = d.id) as answerCount
      FROM documents d
      WHERE d.is_deleted = 0
    `).all() as Array<{ id: string; title: string; questionCount: number; answerCount: number }>;

    for (const doc of docs) {
      this.db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        doc.id,
        "document",
        segmentText(doc.title),
        JSON.stringify({ title: doc.title, questionCount: doc.questionCount, answerCount: doc.answerCount }),
      );
    }

    const questions = this.db.prepare(`
      SELECT q.id, q.text, q.document_id, d.title as documentTitle
      FROM questions q
      JOIN documents d ON q.document_id = d.id
      WHERE q.is_deleted = 0 AND d.is_deleted = 0
    `).all() as Array<{ id: string; text: string; document_id: string; documentTitle: string }>;

    for (const q of questions) {
      this.db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        q.id,
        "question",
        segmentText(q.text),
        JSON.stringify({ questionId: q.id, documentId: q.document_id, documentTitle: q.documentTitle }),
      );
    }

    const answers = this.db.prepare(`
      SELECT a.id, a.content, a.question_id, q.text as questionText, d.id as documentId, d.title as documentTitle
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      JOIN documents d ON q.document_id = d.id
      WHERE q.is_deleted = 0 AND d.is_deleted = 0
    `).all() as Array<{ id: string; content: string; question_id: string; questionText: string; documentId: string; documentTitle: string }>;

    for (const a of answers) {
      this.db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        a.id,
        "answer",
        segmentText(a.content),
        JSON.stringify({ answerId: a.id, questionId: a.question_id, questionText: a.questionText, documentId: a.documentId, documentTitle: a.documentTitle }),
      );
    }

    const tags = this.db.prepare(`
      SELECT t.id, t.name, (SELECT COUNT(*) FROM document_tags WHERE tag_id = t.id) as documentCount
      FROM tags t
    `).all() as Array<{ id: string; name: string; documentCount: number }>;

    for (const t of tags) {
      this.db.prepare("INSERT INTO search_fts(id, type, content, metadata) VALUES (?, ?, ?, ?)").run(
        t.id,
        "tag",
        segmentText(t.name),
        JSON.stringify({ tagName: t.name, documentCount: t.documentCount }),
      );
    }
  }
}
