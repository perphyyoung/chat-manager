import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { SqliteAnswerRepository } from "./SqliteAnswerRepository";
import { Answer } from "@/domain/entities";

type MockFn = Mock<(...args: unknown[]) => unknown>;

interface MockElectronAPI {
  document: {
    findDocumentById: MockFn;
  };
  answer: {
    findAnswerByQuestionId: MockFn;
    saveAnswer: MockFn;
    deleteAnswer: MockFn;
    deleteAllAnswers: MockFn;
    saveAllAnswers: MockFn;
  };
}

describe("SqliteAnswerRepository", () => {
  let repository: SqliteAnswerRepository;
  let mockElectronAPI: MockElectronAPI;

  beforeEach(() => {
    mockElectronAPI = {
      document: {
        findDocumentById: vi.fn(),
      },
      answer: {
        findAnswerByQuestionId: vi.fn(),
        saveAnswer: vi.fn(),
        deleteAnswer: vi.fn(),
        deleteAllAnswers: vi.fn(),
        saveAllAnswers: vi.fn(),
      },
    };
    (window as unknown as { electronAPI: MockElectronAPI }).electronAPI =
      mockElectronAPI;
    repository = new SqliteAnswerRepository();
  });

  describe("findByQuestionId", () => {
    it("should return null when answer not found", async () => {
      mockElectronAPI.answer.findAnswerByQuestionId.mockResolvedValue(null);

      const result = await repository.findAnswerByQuestionId("q1");

      expect(result).toBeNull();
    });

    it("should return answer when found", async () => {
      mockElectronAPI.answer.findAnswerByQuestionId.mockResolvedValue({
        id: "a1",
        questionId: "q1",
        content: "Answer content",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      const result = await repository.findAnswerByQuestionId("q1");

      expect(result).toBeInstanceOf(Answer);
      expect(result?.content).toBe("Answer content");
      expect(result?.questionId).toBe("q1");
    });
  });

  describe("findByDocumentId", () => {
    it("should return empty array when document not found", async () => {
      mockElectronAPI.document.findDocumentById.mockResolvedValue(null);

      const result = await repository.findAnswerByDocumentId("doc1");

      expect(result).toEqual([]);
    });

    it("should return answers when document exists", async () => {
      const mockDoc = {
        answers: [
          {
            id: "a1",
            questionId: "q1",
            content: "Answer 1",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          {
            id: "a2",
            questionId: "q2",
            content: "Answer 2",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
      };
      mockElectronAPI.document.findDocumentById.mockResolvedValue(mockDoc);

      const result = await repository.findAnswerByDocumentId("doc1");

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Answer);
      expect(result[0]?.content).toBe("Answer 1");
      expect(result[1]?.content).toBe("Answer 2");
    });
  });

  describe("save", () => {
    it("should save single answer", async () => {
      const answer = new Answer(
        "a1",
        "q1",
        "Answer content",
        new Date("2024-01-01"),
      );

      await repository.saveAnswer(answer);

      expect(mockElectronAPI.answer.saveAnswer).toHaveBeenCalledWith(
        JSON.stringify(answer.toJSON()),
      );
    });
  });

  describe("saveAll", () => {
    it("should save answers with correct format", async () => {
      const answers = [
        new Answer("a1", "q1", "Answer 1", new Date("2024-01-01")),
        new Answer("a2", "q2", "Answer 2", new Date("2024-01-01")),
      ];

      await repository.saveAllAnswers("doc1", answers);

      expect(mockElectronAPI.answer.saveAllAnswers).toHaveBeenCalledWith(
        "doc1",
        expect.arrayContaining([
          expect.objectContaining({
            id: "a1",
            questionId: "q1",
            content: "Answer 1",
          }),
          expect.objectContaining({
            id: "a2",
            questionId: "q2",
            content: "Answer 2",
          }),
        ]),
      );
    });
  });

  describe("delete", () => {
    it("should delete answer by id", async () => {
      await repository.deleteAnswer("a1");

      expect(mockElectronAPI.answer.deleteAnswer).toHaveBeenCalledWith("a1");
    });
  });

  describe("deleteAll", () => {
    it("should delete answers by ids", async () => {
      await repository.deleteAllAnswers(["a1", "a2"]);

      expect(mockElectronAPI.answer.deleteAllAnswers).toHaveBeenCalledWith([
        "a1",
        "a2",
      ]);
    });

    it("should not call delete when ids array is empty", async () => {
      await repository.deleteAllAnswers([]);

      expect(mockElectronAPI.answer.deleteAllAnswers).not.toHaveBeenCalled();
    });
  });
});
