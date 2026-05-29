import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { SqliteQuestionRepository } from "./SqliteQuestionRepository";
import { Question } from "@/domain/entities";
import type { QuestionDTO } from "@/types/dto";

type MockFn = Mock<(...args: unknown[]) => unknown>;

interface MockElectronAPI {
  db: {
    findById: MockFn;
    questions: {
      save: MockFn;
      delete: MockFn;
    };
  };
}

// 辅助函数：创建 QuestionDTO
function createQuestionDTO(overrides: Partial<QuestionDTO> = {}): QuestionDTO
 {
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
        findById: vi.fn(),
        questions: {
          save: vi.fn(),
          delete: vi.fn(),
        },
      },
    };
    (window as unknown as { electronAPI: MockElectronAPI }).electronAPI = mockElectronAPI;
    repository = new SqliteQuestionRepository();
  });

  describe("findByDocumentId", () => {
    it("should return empty array when document not found", async () => {
      mockElectronAPI.db.findById.mockResolvedValue(null);

      const result = await repository.findByDocumentId("doc1");

      expect(result).toEqual([]);
    });

    it("should return questions when document exists", async () => {
      const mockDoc = {
        questions: [
          createQuestionDTO({ id: "q1", text: "Question 1", order: 0 }),
          createQuestionDTO({ id: "q2", text: "Question 2", order: 1 }),
        ],
      };
      mockElectronAPI.db.findById.mockResolvedValue(mockDoc);

      const result = await repository.findByDocumentId("doc1");

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
      mockElectronAPI.db.findById.mockResolvedValue(mockDoc);

      const result = await repository.findByDocumentId("doc1");

      expect(result).toHaveLength(1);
      expect(result[0]?.isDeleted).toBe(true);
      expect(result[0]?.deletedAt).toBeDefined();
    });
  });

  describe("findById", () => {
    it("should return null when question not found", async () => {
      mockElectronAPI.db.findById.mockResolvedValue({ questions: [] });

      const result = await repository.findById("q1");

      expect(result).toBeNull();
    });

    it("should return question when found", async () => {
      const mockDoc = {
        questions: [createQuestionDTO({ id: "q1" })],
      };
      mockElectronAPI.db.findById.mockResolvedValue(mockDoc);

      const result = await repository.findById("q1");

      expect(result).toBeInstanceOf(Question);
      expect(result?.text).toBe("Question 1");
    });
  });

  describe("saveAll", () => {
    it("should save questions with correct format", async () => {
      const questions = [
        new Question("q1", "Question 1", 0, new Date("2024-01-01")),
        new Question("q2", "Question 2", 1, new Date("2024-01-01")),
      ];

      await repository.saveAll("doc1", questions);

      expect(mockElectronAPI.db.questions.save).toHaveBeenCalledWith(
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
        ])
      );
    });

    it("should include deletedAt for soft deleted questions", async () => {
      const question = new Question(
        "q1",
        "Question 1",
        0,
        new Date("2024-01-01")
      );
      question.softDelete();

      await repository.saveAll("doc1", [question]);

      const savedQuestions = mockElectronAPI.db.questions.save.mock.calls[0]?.[1] as Array<{ isDeleted: boolean; deletedAt: string }>;
      expect(savedQuestions).toBeDefined();
      expect(savedQuestions[0]?.isDeleted).toBe(true);
      expect(savedQuestions[0]?.deletedAt).toBeDefined();
    });
  });

  describe("deleteAll", () => {
    it("should delete questions by ids", async () => {
      await repository.deleteAll(["q1", "q2"]);

      expect(mockElectronAPI.db.questions.delete).toHaveBeenCalledWith([
        "q1",
        "q2",
      ]);
    });

    it("should not call delete when ids array is empty", async () => {
      await repository.deleteAll([]);

      expect(mockElectronAPI.db.questions.delete).not.toHaveBeenCalled();
    });
  });
});
