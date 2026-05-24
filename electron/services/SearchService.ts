import type Database from "better-sqlite3";

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

export class SearchService {
  constructor(private db: Database.Database) {}

  async query(searchText: string, limit = 10): Promise<SearchResults> {
    if (!searchText || searchText.trim().length === 0) {
      return {
        documents: [],
        questions: [],
        answers: [],
        tags: [],
      };
    }

    const escapedQuery = this.escapeQuery(searchText);
    const ftsQuery = `"${escapedQuery}"*`;

    const stmt = this.db.prepare(`
      SELECT id, type, content, metadata
      FROM search_fts
      WHERE search_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(ftsQuery, limit * 4) as FtsRow[];

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
    const rebuildStmt = this.db.prepare(`
      INSERT INTO search_fts(id, type, content, metadata)
      SELECT
        d.id,
        'document',
        d.title,
        json_object('title', d.title, 'questionCount', (SELECT COUNT(*) FROM questions WHERE document_id = d.id), 'answerCount', (SELECT COUNT(*) FROM answers a JOIN questions q ON a.question_id = q.id WHERE q.document_id = d.id))
      FROM documents d
      WHERE d.is_deleted = 0
    `);

    const rebuildQuestionsStmt = this.db.prepare(`
      INSERT INTO search_fts(id, type, content, metadata)
      SELECT
        q.id,
        'question',
        q.text,
        json_object('questionId', q.id, 'documentId', q.document_id, 'documentTitle', d.title)
      FROM questions q
      JOIN documents d ON q.document_id = d.id
      WHERE q.is_deleted = 0 AND d.is_deleted = 0
    `);

    const rebuildAnswersStmt = this.db.prepare(`
      INSERT INTO search_fts(id, type, content, metadata)
      SELECT
        a.id,
        'answer',
        a.content,
        json_object('answerId', a.id, 'questionId', a.question_id, 'questionText', q.text, 'documentId', d.id, 'documentTitle', d.title)
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      JOIN documents d ON q.document_id = d.id
      WHERE q.is_deleted = 0 AND d.is_deleted = 0
    `);

    const rebuildTagsStmt = this.db.prepare(`
      INSERT INTO search_fts(id, type, content, metadata)
      SELECT
        t.id,
        'tag',
        t.name,
        json_object('tagName', t.name, 'documentCount', (SELECT COUNT(*) FROM document_tags WHERE tag_id = t.id))
      FROM tags t
    `);

    this.db.exec("DELETE FROM search_fts");

    this.db.transaction(() => {
      rebuildStmt.run();
      rebuildQuestionsStmt.run();
      rebuildAnswersStmt.run();
      rebuildTagsStmt.run();
    })();
  }
}
