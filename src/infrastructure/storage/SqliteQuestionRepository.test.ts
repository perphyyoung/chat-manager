import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { SqliteQuestionRepository } from "./SqliteQuestionRepository";
import { Question } from "@/domain/entities";
import type { QuestionDTO } from "@/types/dto";

type MockFn = Mock<(...args: unknown[]) => unknown>;

interface MockElectronAPI {
  db: {
    transaction: {
      begin: MockFn;
      commit: MockFn;
      rollback: MockFn;
    };
  };
  document: {
    findDocumentById: MockFn;
  };
  question: {
    saveAllQuestions: MockFn;
    softDeleteQuestion: MockFn;
    restoreQuestion: MockFn;
    getDeletedQuestions: MockFn;
    clearDeletedQuestions: MockFn;
    deleteAllQuestions: MockFn;
  };
}

// 辅助函数：创建 QuestionDTO
function createQuestionDTO(overrides: Partial<QuestionDTO> = {}): QuestionDTO {
  return {
    id: "q1",
    text: "Question 1",
    order: 0,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isDeleted: 0,
    ...overrides,
  };
}

describe("SqliteQuestionRepository", () => {
  let repository: SqliteQuestionRepository;
  let mockElectronAPI: MockElectronAPI;

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
        findDocumentById: vi.fn(),
      },
      question: {
        saveAllQuestions: vi.fn(),
        softDeleteQuestion: vi.fn(),
        restoreQuestion: vi.fn(),
        getDeletedQuestions: vi.fn(),
        clearDeletedQuestions: vi.fn(),
        deleteAllQuestions: vi.fn(),
      },
    };
    (window as unknown as { electronAPI: MockElectronAPI }).electronAPI = mockElectronAPI;
    repository = new SqliteQuestionRepository();
  });

  describe("findByDocumentId", () => {
    it("should return empty array when document not found", async () => {
      mockElectronAPI.document.findDocumentById.mockResolvedValue(null);

      const result = await repository.findQuestionByDocumentId("doc1");

      expect(result).toEqual([]);
    });

    it("should return questions when document exists", async () => {
      const mockDoc = {
        questions: [
          createQuestionDTO({
            id: "q1",
            text: "Question 1",
            order: 0,
          }),
          createQuestionDTO({
            id: "q2",
            text: "Question 2",
            order: 1,
          }),
        ],
      };
      mockElectronAPI.document.findDocumentById.mockResolvedValue(mockDoc);

      const result = await repository.findQuestionByDocumentId("doc1");

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Question);
      expect(result[0]?.text).toBe("Question 1");
      expect(result[1]?.text).toBe("Question 2");
    });

    it("should handle soft deleted questions", async () => {
      const mockDoc = {
        questions: [
          createQuestionDTO({
            id: "q1",
            isDeleted: 1,
            deletedAt: "2024-01-02T00:00:00Z",
          }),
        ],
      };
      mockElectronAPI.document.findDocumentById.mockResolvedValue(mockDoc);

      const result = await repository.findQuestionByDocumentId("doc1");

      expect(result).toHaveLength(1);
      expect(result[0]?.isDeleted).toBe(true);
      expect(result[0]?.deletedAt).toBeDefined();
    });

    it("should restore updatedAt from dto", async () => {
      const mockDoc = {
        questions: [
          createQuestionDTO({
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-06-01T00:00:00Z",
          }),
        ],
      };
      mockElectronAPI.document.findDocumentById.mockResolvedValue(mockDoc);

      const result = await repository.findQuestionByDocumentId("doc1");

      expect(result[0]?.updatedAt.toISOString()).toBe("2024-06-01T00:00:00.000Z");
    });
  });

  describe("softDeleteQuestion", () => {
    it("should soft delete question", async () => {
      await repository.softDeleteQuestion("doc1", "q1");

      expect(mockElectronAPI.question.softDeleteQuestion).toHaveBeenCalledWith("doc1", "q1");
    });
  });

  describe("restoreQuestion", () => {
    it("should restore question", async () => {
      await repository.restoreQuestion("doc1", "q1");

      expect(mockElectronAPI.question.restoreQuestion).toHaveBeenCalledWith("doc1", "q1");
    });
  });

  describe("getDeletedQuestions", () => {
    it("should return deleted questions", async () => {
      mockElectronAPI.question.getDeletedQuestions.mockResolvedValue([
        { id: "q1", text: "Question 1", deletedAt: "2024-01-01T00:00:00Z" },
      ]);

      const result = await repository.getDeletedQuestions("doc1");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "q1",
        text: "Question 1",
        deletedAt: new Date("2024-01-01T00:00:00Z"),
      });
    });

    it("should return empty array when no deleted questions", async () => {
      mockElectronAPI.question.getDeletedQuestions.mockResolvedValue([]);

      const result = await repository.getDeletedQuestions("doc1");

      expect(result).toEqual([]);
    });
  });

  describe("clearDeletedQuestions", () => {
    it("should clear deleted questions", async () => {
      await repository.clearDeletedQuestions("doc1");

      expect(mockElectronAPI.question.clearDeletedQuestions).toHaveBeenCalledWith("doc1");
    });
  });

  describe("saveAll", () => {
    it("should save questions with correct format", async () => {
      const questions = [
        new Question("q1", "Question 1", 0, new Date("2024-01-01")),
        new Question("q2", "Question 2", 1, new Date("2024-01-01")),
      ];

      await repository.saveAllQuestions("doc1", questions);

      expect(mockElectronAPI.question.saveAllQuestions).toHaveBeenCalledWith(
        "doc1",
        expect.arrayContaining([
          expect.objectContaining({
            id: "q1",
            text: "Question 1",
            order: 0,
            isDeleted: false,
          }),
          expect.objectContaining({
            id: "q2",
            text: "Question 2",
            order: 1,
            isDeleted: false,
          }),
        ]),
      );
    });

    it("should include deletedAt for soft deleted questions", async () => {
      const question = new Question("q1", "Question 1", 0, new Date("2024-01-01"));
      question.softDelete();

      await repository.saveAllQuestions("doc1", [question]);

      const savedQuestions = mockElectronAPI.question.saveAllQuestions.mock.calls[0]?.[1] as Array<{
        isDeleted: boolean;
        deletedAt: string;
      }>;
      expect(savedQuestions).toBeDefined();
      expect(savedQuestions[0]?.isDeleted).toBe(true);
      expect(savedQuestions[0]?.deletedAt).toBeDefined();
    });
  });
});
