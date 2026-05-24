import { describe, it, expect, beforeEach } from "vitest";
import { DocumentApplicationService } from "./DocumentApplicationService";
import { SimpleEventBus } from "../../domain/events";
import { NotFoundError } from "../../domain/errors";
import { MockDocumentRepository } from "./MockDocumentRepository";

describe("DocumentApplicationService", () => {
  let service: DocumentApplicationService;
  let eventBus: SimpleEventBus;

  beforeEach(() => {
    eventBus = new SimpleEventBus();
    const repo = new MockDocumentRepository();
    service = new DocumentApplicationService(repo, eventBus);
  });

  it("should create a document", async () => {
    const doc = await service.createDocument("Test Doc", ["Q1", "Q2"]);

    expect(doc.title).toBe("Test Doc");
    expect(doc.questionCount).toBe(2);
  });

  it("should create a document without questions", async () => {
    const doc = await service.createDocument("Empty Doc");

    expect(doc.title).toBe("Empty Doc");
    expect(doc.questionCount).toBe(0);
  });

  it("should load all documents", async () => {
    await service.createDocument("Doc 1");
    await service.createDocument("Doc 2");

    const docs = await service.loadAllDocuments();

    expect(docs).toHaveLength(2);
  });

  it("should select an existing document", async () => {
    const doc = await service.createDocument("Test Doc");
    let eventFired = false;

    eventBus.on("DocumentSelected", () => {
      eventFired = true;
    });

    await service.selectDocument(doc.id);

    expect(eventFired).toBe(true);
  });

  it("should throw when selecting non-existent document", async () => {
    await expect(service.selectDocument("non-existent")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should update document title", async () => {
    const doc = await service.createDocument("Old Title");

    await service.updateDocumentTitle(doc.id, "New Title");

    const updated = await service.getDocument(doc.id);
    expect(updated?.title).toBe("New Title");
  });

  it("should throw when updating non-existent document title", async () => {
    await expect(
      service.updateDocumentTitle("non-existent", "New Title"),
    ).rejects.toThrow(NotFoundError);
  });

  it("should delete document", async () => {
    const doc = await service.createDocument("To Delete");

    await service.deleteDocument(doc.id);

    const found = await service.getDocument(doc.id);
    expect(found).toBeNull();
  });

  it("should throw when deleting non-existent document", async () => {
    await expect(service.deleteDocument("non-existent")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should add question to document", async () => {
    const doc = await service.createDocument("Test Doc");

    await service.addQuestion(doc.id, "New Question?");

    const updated = await service.getDocument(doc.id);
    expect(updated?.questionCount).toBe(1);
    expect(updated?.questions[0]?.text).toBe("New Question?");
  });

  it("should select question in document", async () => {
    const doc = await service.createDocument("Test Doc", ["Q1", "Q2"]);
    let eventFired = false;

    eventBus.on("QuestionActivated", () => {
      eventFired = true;
    });

    const questionId = doc.questions[0]!.id;
    await service.selectQuestion(doc.id, questionId);

    expect(eventFired).toBe(true);
  });

  it("should throw when selecting non-existent question", async () => {
    const doc = await service.createDocument("Test Doc");

    await expect(
      service.selectQuestion(doc.id, "non-existent"),
    ).rejects.toThrow(NotFoundError);
  });
});
