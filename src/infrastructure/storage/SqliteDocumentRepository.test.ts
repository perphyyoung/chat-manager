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
    findAll: MockFn;
    findById: MockFn;
    softDelete: MockFn;
    restore: MockFn;
    delete: MockFn;
    exists: MockFn;
    transaction: {
      begin: MockFn;
      commit: MockFn;
      rollback: MockFn;
    };
    document: {
      save: MockFn;
      delete: MockFn;
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
  question: {
    softDelete: MockFn;
    restore: MockFn;
    getDeleted: MockFn;
    clearDeletedQuestions: MockFn;
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
        findAll: vi.fn(),
        findById: vi.fn(),
        softDelete: vi.fn(),
        restore: vi.fn(),
        delete: vi.fn(),
        exists: vi.fn(),
        transaction: {
          begin: vi.fn(),
          commit: vi.fn(),
          rollback: vi.fn(),
        },
        document: {
          save: vi.fn(),
          delete: vi.fn(),
        },
      },
      question: {
        softDelete: vi.fn(),
        restore: vi.fn(),
        getDeleted: vi.fn(),
        clearDeletedQuestions: vi.fn(),
      },
      tag: {
        findDocumentsByTagId: vi.fn(),
        addTagToDocument: vi.fn(),
        removeTagFromDocument: vi.fn(),
        getDocumentTags: vi.fn(),
      },
    };

    mockQuestionRepo = {
      findByDocumentId: vi.fn(),
      findById: vi.fn(),
      saveAll: vi.fn(),
      delete: vi.fn(),
      deleteAll: vi.fn(),
    };

    mockAnswerRepo = {
      findByQuestionId: vi.fn(),
      findByDocumentId: vi.fn(),
      save: vi.fn(),
      saveAll: vi.fn(),
      delete: vi.fn(),
      deleteAll: vi.fn(),
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

      await repository.save(document);

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

      await repository.save(document);

      expect(mockElectronAPI.db.document.save).toHaveBeenCalledWith({
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

      await repository.save(document);

      expect(mockQuestionRepo.saveAll).toHaveBeenCalledWith(
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

      await repository.save(document);

      expect(mockAnswerRepo.saveAll).toHaveBeenCalledWith(
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

      await repository.save(document);

      expect(mockElectronAPI.db.transaction.commit).toHaveBeenCalledWith(
        "tx-123",
      );
    });

    it("should rollback transaction on error", async () => {
      mockElectronAPI.db.transaction.begin.mockResolvedValue("tx-123");
      mockElectronAPI.db.document.save.mockRejectedValue(new Error("DB Error"));

      const document = new Document(
        "doc1",
        "Test Doc",
        [],
        [],
        new Date("2024-01-01"),
        new Date("2024-01-01"),
      );

      await expect(repository.save(document)).rejects.toThrow("DB Error");
      expect(mockElectronAPI.db.transaction.rollback).toHaveBeenCalledWith(
        "tx-123",
      );
    });

    it("should not commit if rollback was called", async () => {
      mockElectronAPI.db.transaction.begin.mockResolvedValue("tx-123");
      mockElectronAPI.db.document.save.mockRejectedValue(new Error("DB Error"));

      const document = new Document(
        "doc1",
        "Test Doc",
        [],
        [],
        new Date("2024-01-01"),
        new Date("2024-01-01"),
      );

      try {
        await repository.save(document);
      } catch {
        // expected
      }

      expect(mockElectronAPI.db.transaction.commit).not.toHaveBeenCalled();
    });
  });

  describe("other methods", () => {
    it("should find all documents", async () => {
      mockElectronAPI.db.findAll.mockResolvedValue([
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

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Document);
    });

    it("should find document by id", async () => {
      mockElectronAPI.db.findById.mockResolvedValue({
        id: "doc1",
        title: "Doc 1",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        questions: [],
        answers: [],
        tags: [],
      });

      const result = await repository.findById("doc1");

      expect(result).toBeInstanceOf(Document);
      expect(result?.title).toBe("Doc 1");
    });

    it("should return null when document not found", async () => {
      mockElectronAPI.db.findById.mockResolvedValue(null);

      const result = await repository.findById("nonexistent");

      expect(result).toBeNull();
    });

    it("should check if document exists", async () => {
      mockElectronAPI.db.exists.mockResolvedValue(true);

      const result = await repository.exists("doc1");

      expect(result).toBe(true);
    });

    it("should soft delete document", async () => {
      await repository.softDelete("doc1");

      expect(mockElectronAPI.db.softDelete).toHaveBeenCalledWith("doc1");
    });

    it("should restore document", async () => {
      await repository.restore("doc1");

      expect(mockElectronAPI.db.restore).toHaveBeenCalledWith("doc1");
    });

    it("should permanently delete document", async () => {
      await repository.delete("doc1");

      expect(mockElectronAPI.db.document.delete).toHaveBeenCalledWith("doc1");
    });
  });
});
