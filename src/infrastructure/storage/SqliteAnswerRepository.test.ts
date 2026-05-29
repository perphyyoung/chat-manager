import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { SqliteAnswerRepository } from "./SqliteAnswerRepository";
import { Answer } from "@/domain/entities";

type MockFn = Mock<(...args: unknown[]) => unknown>;

interface MockElectronAPI {
  db: {
    findById: MockFn;
    answers: {
      save: MockFn;
      delete: MockFn;
    };
  };
  answer: {
    findByQuestionId: MockFn;
    save: MockFn;
    delete: MockFn;
  };
}

describe("SqliteAnswerRepository", () => {
  let repository: SqliteAnswerRepository;
  let mockElectronAPI: MockElectronAPI;

  beforeEach(() => {
    mockElectronAPI = {
      db: {
        findById: vi.fn(),
        answers: {
          save: vi.fn(),
          delete: vi.fn(),
        },
      },
      answer: {
        findByQuestionId: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      },
    };
    (window as unknown as { electronAPI: MockElectronAPI }).electronAPI = mockElectronAPI;
    repository = new SqliteAnswerRepository();
  });

  describe("findByQuestionId", () => {
    it("should return null when answer not found", async () => {
      mockElectronAPI.answer.findByQuestionId.mockResolvedValue(null);

      const result = await repository.findByQuestionId("q1");

      expect(result).toBeNull();
    });

    it("should return answer when found", async () => {
      mockElectronAPI.answer.findByQuestionId.mockResolvedValue({
        id: "a1",
        questionId: "q1",
        content: "Answer content",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });

      const result = await repository.findByQuestionId("q1");

      expect(result).toBeInstanceOf(Answer);
      expect(result?.content).toBe("Answer content");
      expect(result?.questionId).toBe("q1");
    });
  });

  describe("findByDocumentId", () => {
    it("should return empty array when document not found", async () => {
      mockElectronAPI.db.findById.mockResolvedValue(null);

      const result = await repository.findByDocumentId("doc1");

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
      mockElectronAPI.db.findById.mockResolvedValue(mockDoc);

      const result = await repository.findByDocumentId("doc1");

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
        new Date("2024-01-01")
      );

      await repository.save(answer);

      expect(mockElectronAPI.answer.save).toHaveBeenCalledWith(
        JSON.stringify(answer.toJSON())
      );
    });
  });

  describe("saveAll", () => {
    it("should save answers with correct format", async () => {
      const answers = [
        new Answer("a1", "q1", "Answer 1", new Date("2024-01-01")),
        new Answer("a2", "q2", "Answer 2", new Date("2024-01-01")),
      ];

      await repository.saveAll("doc1", answers);

      expect(mockElectronAPI.db.answers.save).toHaveBeenCalledWith(
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
        ])
      );
    });
  });

  describe("delete", () => {
    it("should delete answer by id", async () => {
      await repository.delete("a1");

      expect(mockElectronAPI.answer.delete).toHaveBeenCalledWith("a1");
    });
  });

  describe("deleteAll", () => {
    it("should delete answers by ids", async () => {
      await repository.deleteAll(["a1", "a2"]);

      expect(mockElectronAPI.db.answers.delete).toHaveBeenCalledWith([
        "a1",
        "a2",
      ]);
    });

    it("should not call delete when ids array is empty", async () => {
      await repository.deleteAll([]);

      expect(mockElectronAPI.db.answers.delete).not.toHaveBeenCalled();
    });
  });
});
