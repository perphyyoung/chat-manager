import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import type { DatabaseSync as SqliteDB } from "node:sqlite";
import { SearchService } from "./SearchService";

describe("SearchService", () => {
  let service: SearchService;
  let db: SqliteDB;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    service = new SearchService(db);
  });

  describe("query", () => {
    it("should return empty results for empty search text", async () => {
      const result = await service.query("");
      expect(result).toEqual({
        documents: [],
        questions: [],
        answers: [],
        tags: [],
      });
    });

    it("should return empty results for whitespace only", async () => {
      const result = await service.query("   ");
      expect(result).toEqual({
        documents: [],
        questions: [],
        answers: [],
        tags: [],
      });
    });

    it("should return empty results for null-like input", async () => {
      const result = await service.query("  \n\t  ");
      expect(result).toEqual({
        documents: [],
        questions: [],
        answers: [],
        tags: [],
      });
    });
  });

  describe("escapeQuery", () => {
    it("should escape double quotes", () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const result = (service as any).escapeQuery('test "query"');
      expect(result).toBe("test query");
    });

    it("should escape asterisks", () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const result = (service as any).escapeQuery("test*");
      expect(result).toBe("test");
    });

    it("should trim whitespace", () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const result = (service as any).escapeQuery("  test  ");
      expect(result).toBe("test");
    });

    it("should handle multiple special characters", () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const result = (service as any).escapeQuery('test "query" * data');
      expect(result).toBe("test query  data");
    });
  });

  describe("query with results", () => {
    beforeEach(() => {
      db.exec(`
        CREATE VIRTUAL TABLE search_fts USING fts5(id, type, content, metadata, tokenize='unicode61');
        INSERT INTO search_fts VALUES ('doc-1', 'document', 'Test Document', '{"questionCount": 5, "answerCount": 10}');
        INSERT INTO search_fts VALUES ('q-1', 'question', 'What is this?', '{"documentId": "doc-1", "documentTitle": "Test Document"}');
        INSERT INTO search_fts VALUES ('a-1', 'answer', 'This is a test answer', '{"questionText": "What is this?", "questionId": "q-1", "documentId": "doc-1", "documentTitle": "Test Document"}');
        INSERT INTO search_fts VALUES ('tag-1', 'tag', 'testing', '{"documentCount": 3}');
      `);
    });

    it("should parse document results correctly", async () => {
      const result = await service.query("Test");
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual({
        id: "doc-1",
        title: "Test Document",
        questionCount: 5,
        answerCount: 10,
      });
    });

    it("should parse question results correctly", async () => {
      const result = await service.query("What");
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).toEqual({
        id: "q-1",
        text: "What is this?",
        documentId: "doc-1",
        documentTitle: "Test Document",
      });
    });

    it("should parse answer results correctly", async () => {
      const result = await service.query("test");
      expect(result.answers).toHaveLength(1);
      expect(result.answers[0]).toEqual({
        id: "a-1",
        content: "This is a test answer",
        questionText: "What is this?",
        questionId: "q-1",
        documentId: "doc-1",
        documentTitle: "Test Document",
      });
    });

    it("should parse tag results correctly", async () => {
      const result = await service.query("testing");
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0]).toEqual({
        id: "tag-1",
        name: "testing",
        documentCount: 3,
      });
    });
  });

  describe("query with missing metadata fields", () => {
    beforeEach(() => {
      db.exec(`
        CREATE VIRTUAL TABLE search_fts USING fts5(id, type, content, metadata, tokenize='unicode61');
        INSERT INTO search_fts VALUES ('doc-1', 'document', 'Test', '{}');
        INSERT INTO search_fts VALUES ('q-1', 'question', 'Question', '{}');
        INSERT INTO search_fts VALUES ('a-1', 'answer', 'Answer', '{}');
        INSERT INTO search_fts VALUES ('tag-1', 'tag', 'Tag', '{}');
      `);
    });

    it("should handle missing document metadata gracefully", async () => {
      const result = await service.query("Test");
      expect(result.documents[0]).toEqual({
        id: "doc-1",
        title: "Test",
        questionCount: 0,
        answerCount: 0,
      });
    });

    it("should handle missing question metadata gracefully", async () => {
      const result = await service.query("Question");
      expect(result.questions[0]).toEqual({
        id: "q-1",
        text: "Question",
        documentId: "",
        documentTitle: "",
      });
    });

    it("should handle missing answer metadata gracefully", async () => {
      const result = await service.query("Answer");
      expect(result.answers[0]).toEqual({
        id: "a-1",
        content: "Answer",
        questionText: "",
        questionId: "",
        documentId: "",
        documentTitle: "",
      });
    });

    it("should handle missing tag metadata gracefully", async () => {
      const result = await service.query("Tag");
      expect(result.tags[0]).toEqual({
        id: "tag-1",
        name: "Tag",
        documentCount: 0,
      });
    });
  });

  describe("query respects limit per type", () => {
    beforeEach(() => {
      db.exec(`CREATE VIRTUAL TABLE search_fts USING fts5(id, type, content, metadata, tokenize='unicode61');`);
      for (let i = 0; i < 15; i++) {
        db.prepare(`INSERT INTO search_fts VALUES (?, 'document', ?, ?)`).run(`doc-${i}`, `Document ${i}`, `{"questionCount": ${i}, "answerCount": ${i}}`);
      }
    });

    it("should limit documents to 10 by default", async () => {
      const result = await service.query("Document");
      expect(result.documents).toHaveLength(10);
      expect(result.documents[0].id).toBe("doc-0");
      expect(result.documents[9].id).toBe("doc-9");
    });

    it("should respect custom limit", async () => {
      const result = await service.query("Document", 5);
      expect(result.documents).toHaveLength(5);
    });
  });

  describe("rebuildIndex", () => {
    beforeEach(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          is_deleted INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS questions (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          text TEXT NOT NULL,
          is_deleted INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS answers (
          id TEXT PRIMARY KEY,
          question_id TEXT NOT NULL,
          content TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS document_tags (
          document_id TEXT NOT NULL,
          tag_id TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE search_fts USING fts5(id, type, content, metadata, tokenize='unicode61');

        INSERT INTO documents VALUES ('doc-1', 'Test Doc', 0);
        INSERT INTO questions VALUES ('q-1', 'doc-1', 'Test Question?', 0);
        INSERT INTO answers VALUES ('a-1', 'q-1', 'Test Answer');
        INSERT INTO tags VALUES ('tag-1', 'TestTag');
        INSERT INTO document_tags VALUES ('doc-1', 'tag-1');
      `);
    });

    it("should clear existing index before rebuilding", async () => {
      db.prepare(`INSERT INTO search_fts VALUES ('old-doc', 'document', 'Old', '{}')`).run();

      await service.rebuildIndex();

      const result = db.prepare(`SELECT COUNT(*) as count FROM search_fts WHERE id = 'old-doc'`).get() as { count: number };
      expect(result.count).toBe(0);
    });

    it("should rebuild all entity types", async () => {
      await service.rebuildIndex();

      const result = db.prepare(`SELECT COUNT(*) as count FROM search_fts`).get() as { count: number };
      expect(result.count).toBeGreaterThan(0);
    });
  });
});
