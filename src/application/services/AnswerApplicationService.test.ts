import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnswerApplicationService } from "./AnswerApplicationService";
import { Document, Question, Answer } from "../../domain/entities";
import {
  SimpleEventBus,
  AnswerCreatedEvent,
  AnswerUpdatedEvent,
  AnswerDeletedEvent,
} from "../../domain/events";
import type { DocumentRepository, AnswerRepository } from "../../domain/repositories";
import { NotFoundError } from "../../domain/errors";

describe("AnswerApplicationService", () => {
  let service: AnswerApplicationService;
  let mockDocumentRepo: DocumentRepository;
  let mockAnswerRepo: AnswerRepository;
  let eventBus: SimpleEventBus;

  const mockDate = new Date("2025-01-01T00:00:00.000Z");

  beforeEach(() => {
    mockDocumentRepo = {
      findAllDocuments: vi.fn<() => Promise<Document[]>>(),
      findAllDeletedDocuments: vi.fn<() => Promise<Document[]>>(),
      listSummaries: vi.fn(),
      findDocumentById: vi.fn<() => Promise<Document | null>>(),
      findByTagId: vi.fn<() => Promise<Document[]>>(),
      saveDocument: vi.fn<() => Promise<void>>(),
      softDeleteDocument: vi.fn<() => Promise<void>>(),
      restoreDocument: vi.fn<() => Promise<void>>(),
      deleteDocument: vi.fn<() => Promise<void>>(),
      existsDocument: vi.fn<() => Promise<boolean>>(),
      permanentlyDeleteQuestion: vi.fn<() => Promise<void>>(),
      addTag: vi.fn<() => Promise<void>>(),
      removeTag: vi.fn<() => Promise<void>>(),
      getTags: vi.fn<() => Promise<Array<{ id: string; name: string }>>>(),
    };

    mockAnswerRepo = {
      findAnswerByQuestionId: vi.fn<() => Promise<Answer | null>>(),
      findAnswerByDocumentId: vi.fn<() => Promise<Answer[]>>(),
      saveAnswer: vi.fn<() => Promise<void>>(),
      saveAllAnswers: vi.fn<() => Promise<void>>(),
      deleteAnswer: vi.fn<() => Promise<void>>(),
      deleteAllAnswers: vi.fn<() => Promise<void>>(),
    };

    eventBus = new SimpleEventBus();
    service = new AnswerApplicationService(mockDocumentRepo, mockAnswerRepo, eventBus);
  });

  describe("addAnswer", () => {
    it("should add answer to existing question", async () => {
      const question = new Question("q1", "Test question", 0, mockDate);
      const document = new Document("doc1", "Test Doc", [question], [], mockDate);

      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      const answer = await service.addAnswer("doc1", "q1", "This is the answer");

      expect(answer.questionId).toBe("q1");
      expect(answer.content).toBe("This is the answer");
      expect(mockDocumentRepo.saveDocument).toHaveBeenCalled();
      expect(mockAnswerRepo.saveAnswer).toHaveBeenCalled();
      // 回答新增后问题视为活跃：updatedAt 后移
      expect(question.updatedAt.getTime()).toBeGreaterThan(mockDate.getTime());
    });

    it("should throw NotFoundError when document not found", async () => {
      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(null);

      await expect(service.addAnswer("doc1", "q1", "Answer")).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when question not found in document", async () => {
      const document = new Document("doc1", "Test Doc", [], [], mockDate);
      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      await expect(service.addAnswer("doc1", "q1", "Answer")).rejects.toThrow(NotFoundError);
    });

    it("should throw error when answer already exists", async () => {
      const question = new Question("q1", "Test question", 0, mockDate);
      const existingAnswer = new Answer("a1", "q1", "Existing answer", mockDate);
      const document = new Document("doc1", "Test Doc", [question], [existingAnswer], mockDate);

      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      await expect(service.addAnswer("doc1", "q1", "New answer")).rejects.toThrow(
        `Answer already exists for question q1`,
      );
    });

    it("should emit AnswerCreatedEvent", async () => {
      const question = new Question("q1", "Test question", 0, mockDate);
      const document = new Document("doc1", "Test Doc", [question], [], mockDate);

      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      const events: AnswerCreatedEvent[] = [];
      eventBus.on("AnswerCreatedEvent", (e) => events.push(e as AnswerCreatedEvent));

      await service.addAnswer("doc1", "q1", "Answer");

      expect(events).toHaveLength(1);
      expect(events[0]!.documentId).toBe("doc1");
      expect(events[0]!.questionId).toBe("q1");
    });
  });

  describe("updateAnswer", () => {
    it("should update answer content", async () => {
      const question = new Question("q1", "Test question", 0, mockDate);
      const answer = new Answer("a1", "q1", "Original content", mockDate);
      const document = new Document("doc1", "Test Doc", [question], [answer], mockDate);

      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      await service.updateAnswer("doc1", "a1", "Updated content");

      expect(answer.content).toBe("Updated content");
      expect(mockDocumentRepo.saveDocument).toHaveBeenCalled();
      expect(mockAnswerRepo.saveAnswer).toHaveBeenCalled();
      // 回答编辑后问题视为活跃：updatedAt 后移
      expect(question.updatedAt.getTime()).toBeGreaterThan(mockDate.getTime());
    });

    it("should throw NotFoundError when document not found", async () => {
      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(null);

      await expect(service.updateAnswer("doc1", "a1", "Content")).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when answer not found", async () => {
      const document = new Document("doc1", "Test Doc", [], [], mockDate);
      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      await expect(service.updateAnswer("doc1", "a1", "Content")).rejects.toThrow(NotFoundError);
    });

    it("should emit AnswerUpdatedEvent", async () => {
      const question = new Question("q1", "Test question", 0, mockDate);
      const answer = new Answer("a1", "q1", "Original content", mockDate);
      const document = new Document("doc1", "Test Doc", [question], [answer], mockDate);

      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      const events: AnswerUpdatedEvent[] = [];
      eventBus.on("AnswerUpdatedEvent", (e) => events.push(e as AnswerUpdatedEvent));

      await service.updateAnswer("doc1", "a1", "Updated");

      expect(events).toHaveLength(1);
      expect(events[0]!.answerId).toBe("a1");
    });
  });

  describe("deleteAnswer", () => {
    it("should delete answer from document", async () => {
      const question = new Question("q1", "Test question", 0, mockDate);
      const answer = new Answer("a1", "q1", "Content", mockDate);
      const document = new Document("doc1", "Test Doc", [question], [answer], mockDate);

      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      await service.deleteAnswer("doc1", "a1");

      expect(document.answers).toHaveLength(0);
      expect(mockDocumentRepo.saveDocument).toHaveBeenCalled();
      expect(mockAnswerRepo.deleteAnswer).toHaveBeenCalledWith("a1");
      // 回答删除后问题视为活跃：updatedAt 后移
      expect(question.updatedAt.getTime()).toBeGreaterThan(mockDate.getTime());
    });

    it("should throw NotFoundError when document not found", async () => {
      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(null);

      await expect(service.deleteAnswer("doc1", "a1")).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when answer not found", async () => {
      const document = new Document("doc1", "Test Doc", [], [], mockDate);
      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      await expect(service.deleteAnswer("doc1", "a1")).rejects.toThrow(NotFoundError);
    });

    it("should emit AnswerDeletedEvent", async () => {
      const question = new Question("q1", "Test question", 0, mockDate);
      const answer = new Answer("a1", "q1", "Content", mockDate);
      const document = new Document("doc1", "Test Doc", [question], [answer], mockDate);

      vi.mocked(mockDocumentRepo.findDocumentById).mockResolvedValue(document);

      const events: AnswerDeletedEvent[] = [];
      eventBus.on("AnswerDeletedEvent", (e) => events.push(e as AnswerDeletedEvent));

      await service.deleteAnswer("doc1", "a1");

      expect(events).toHaveLength(1);
      expect(events[0]!.documentId).toBe("doc1");
      expect(events[0]!.answerId).toBe("a1");
    });
  });

  describe("getAnswerByQuestionId", () => {
    it("should return answer when found", async () => {
      const answer = new Answer("a1", "q1", "Content", mockDate);
      vi.mocked(mockAnswerRepo.findAnswerByQuestionId).mockResolvedValue(answer);

      const result = await service.getAnswerByQuestionId("q1");

      expect(result).toEqual(answer);
    });

    it("should return null when answer not found", async () => {
      vi.mocked(mockAnswerRepo.findAnswerByQuestionId).mockResolvedValue(null);

      const result = await service.getAnswerByQuestionId("q1");

      expect(result).toBeNull();
    });
  });
});
