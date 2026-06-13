import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { SqliteDocumentRepository } from "./SqliteDocumentRepository";
import { Document, Question, Answer } from "@/domain/entities";
import type {
  QuestionRepository,
  AnswerRepository,
} from "@/domain/repositories";

type MockFn = Mock<(...args: unknown[]) => unknown>;

interface MockElectronAPI {
  db: {
    transaction: {
      begin: MockFn;
      commit: MockFn;
      rollback: MockFn;
    };
    questions?: {
      save: MockFn;
      delete: MockFn;
    };
    answers?: {
      save: MockFn;
      delete: MockFn;
    };
  };
  document: {
    findAllDocuments: MockFn;
    findDocumentById: MockFn;
    saveDocument: MockFn;
    deleteDocument: MockFn;
    softDeleteDocument: MockFn;
    restoreDocument: MockFn;
    existsDocument: MockFn;
  };
  question: {
    moveQuestionToDocument: MockFn;
  };
  tag: {
    findDocumentsByTagId: MockFn;
    addTagToDocument: MockFn;
    removeTagFromDocument: MockFn;
    getDocumentTags: MockFn;
  };
}

describe("SqliteDocumentRepository", () => {
  let repository: SqliteDocumentRepository;
  let mockElectronAPI: MockElectronAPI;
  let mockQuestionRepo: QuestionRepository;
  let mockAnswerRepo: AnswerRepository;

  beforeEach(() => {
    mockElectronAPI = {
      db: {
        transaction: {
          begin: vi.fn(),
          commit: vi.fn(),
          rollback: vi.fn(),
        },
      },
      document: {
        findAllDocuments: vi.fn(),
        findDocumentById: vi.fn(),
        saveDocument: vi.fn(),
        deleteDocument: vi.fn(),
        softDeleteDocument: vi.fn(),
        restoreDocument: vi.fn(),
        existsDocument: vi.fn(),
      },
      question: {
        moveQuestionToDocument: vi.fn(),
      },
      tag: {
        findDocumentsByTagId: vi.fn(),
        addTagToDocument: vi.fn(),
        removeTagFromDocument: vi.fn(),
        getDocumentTags: vi.fn(),
      },
    };

    mockQuestionRepo = {
      findQuestionByDocumentId: vi.fn(),
      saveAllQuestions: vi.fn(),
      softDeleteQuestion: vi.fn(),
      restoreQuestion: vi.fn(),
      getDeletedQuestions: vi.fn(),
      clearDeletedQuestions: vi.fn(),
      delete: vi.fn(),
      deleteAll: vi.fn(),
    };

    mockAnswerRepo = {
      findAnswerByQuestionId: vi.fn(),
      findAnswerByDocumentId: vi.fn(),
      saveAnswer: vi.fn(),
      saveAllAnswers: vi.fn(),
      deleteAnswer: vi.fn(),
      deleteAllAnswers: vi.fn(),
    };

    (window as unknown as { electronAPI: MockElectronAPI }).electronAPI =
      mockElectronAPI;
    repository = new SqliteDocumentRepository();
    repository.setRepositories(mockQuestionRepo, mockAnswerRepo);
  });

  describe("save with transaction", () => {
    it("should begin transaction before saving", async () => {
      mockElectronAPI.db.transaction.begin.mockResolvedValue("tx-123");

      const document = new Document(
        "doc1",
        "Test Doc",
        [],
        [],
        new Date("2024-01-01"),
        new Date("2024-01-01"),
      );

      await repository.saveDocument(document);

      expect(mockElectronAPI.db.transaction.begin).toHaveBeenCalled();
    });

    it("should save document metadata", async () => {
      mockElectronAPI.db.transaction.begin.mockResolvedValue("tx-123");

      const document = new Document(
        "doc1",
        "Test Doc",
        [],
        [],
        new Date("2024-01-01"),
        new Date("2024-01-01"),
      );

      await repository.saveDocument(document);

      expect(mockElectronAPI.document.saveDocument).toHaveBeenCalledWith({
        id: "doc1",
        title: "Test Doc",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it("should save questions using QuestionRepository", async () => {
      mockElectronAPI.db.transaction.begin.mockResolvedValue("tx-123");

      const questions = [
        new Question("q1", "Question 1", 0, new Date("2024-01-01")),
        new Question("q2", "Question 2", 1, new Date("2024-01-01")),
      ];
      const document = new Document(
        "doc1",
        "Test Doc",
        questions,
        [],
        new Date("2024-01-01"),
        new Date("2024-01-01"),
      );

      await repository.saveDocument(document);

      expect(mockQuestionRepo.saveAllQuestions).toHaveBeenCalledWith(
        "doc1",
        expect.any(Array),
      );
    });

    it("should save answers using AnswerRepository", async () => {
      mockElectronAPI.db.transaction.begin.mockResolvedValue("tx-123");

      const answers = [
        new Answer("a1", "q1", "Answer 1", new Date("2024-01-01")),
      ];
      const document = new Document(
        "doc1",
        "Test Doc",
        [],
        answers,
        new Date("2024-01-01"),
        new Date("2024-01-01"),
      );

      await repository.saveDocument(document);

      expect(mockAnswerRepo.saveAllAnswers).toHaveBeenCalledWith(
        "doc1",
        expect.any(Array),
      );
    });

    it("should commit transaction after successful save", async () => {
      mockElectronAPI.db.transaction.begin.mockResolvedValue("tx-123");

      const document = new Document(
        "doc1",
        "Test Doc",
        [],
        [],
        new Date("2024-01-01"),
        new Date("2024-01-01"),
      );

      await repository.saveDocument(document);

      expect(mockElectronAPI.db.transaction.commit).toHaveBeenCalledWith(
        "tx-123",
      );
    });

    it("should rollback transaction on error", async () => {
      mockElectronAPI.db.transaction.begin.mockResolvedValue("tx-123");
      mockElectronAPI.document.saveDocument.mockRejectedValue(new Error("DB Error"));

      const document = new Document(
        "doc1",
        "Test Doc",
        [],
        [],
        new Date("2024-01-01"),
        new Date("2024-01-01"),
      );

      await expect(repository.saveDocument(document)).rejects.toThrow("DB Error");
      expect(mockElectronAPI.db.transaction.rollback).toHaveBeenCalledWith(
        "tx-123",
      );
    });

    it("should not commit if rollback was called", async () => {
      mockElectronAPI.db.transaction.begin.mockResolvedValue("tx-123");
      mockElectronAPI.document.saveDocument.mockRejectedValue(new Error("DB Error"));

      const document = new Document(
        "doc1",
        "Test Doc",
        [],
        [],
        new Date("2024-01-01"),
        new Date("2024-01-01"),
      );

      try {
        await repository.saveDocument(document);
      } catch {
        // expected
      }

      expect(mockElectronAPI.db.transaction.commit).not.toHaveBeenCalled();
    });
  });

  describe("other methods", () => {
    it("should find all documents", async () => {
      mockElectronAPI.document.findAllDocuments.mockResolvedValue([
        {
          id: "doc1",
          title: "Doc 1",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          questions: [],
          answers: [],
          tags: [],
        },
      ]);

      const result = await repository.findAllDocuments();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Document);
    });

    it("should find document by id", async () => {
      mockElectronAPI.document.findDocumentById.mockResolvedValue({
        id: "doc1",
        title: "Doc 1",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        questions: [],
        answers: [],
        tags: [],
      });

      const result = await repository.findDocumentById("doc1");

      expect(result).toBeInstanceOf(Document);
      expect(result?.title).toBe("Doc 1");
    });

    it("should return null when document not found", async () => {
      mockElectronAPI.document.findDocumentById.mockResolvedValue(null);

      const result = await repository.findDocumentById("nonexistent");

      expect(result).toBeNull();
    });

    it("should check if document exists", async () => {
      mockElectronAPI.document.existsDocument.mockResolvedValue(true);

      const result = await repository.existsDocument("doc1");

      expect(result).toBe(true);
    });

    it("should soft delete document", async () => {
      await repository.softDeleteDocument("doc1");

      expect(mockElectronAPI.document.softDeleteDocument).toHaveBeenCalledWith("doc1");
    });

    it("should restore document", async () => {
      await repository.restoreDocument("doc1");

      expect(mockElectronAPI.document.restoreDocument).toHaveBeenCalledWith("doc1");
    });

    it("should permanently delete document", async () => {
      await repository.deleteDocument("doc1");

      expect(mockElectronAPI.document.deleteDocument).toHaveBeenCalledWith("doc1");
    });

    it("should move question to another document", async () => {
      await repository.moveQuestionToDocument("q1", "doc2");

      expect(mockElectronAPI.question.moveQuestionToDocument).toHaveBeenCalledWith(
        "q1",
        "doc2",
      );
    });
  });
});
