import { describe, it, expect, beforeEach } from "vitest";
import { Document, Question, Conversation, Message } from "../domain/entities";
import { DocumentSerializer } from "./persistence/DocumentSerializer";
import { LocalStorageDocumentRepository } from "./storage/LocalStorageDocumentRepository";
import { LocalStorageSettingsRepository } from "./storage/LocalStorageSettingsRepository";
import { InMemoryDocumentRepository } from "./storage/InMemoryDocumentRepository";
import { InMemorySettingsRepository } from "./storage/InMemorySettingsRepository";

function createTestDocument(): Document {
  return new Document(
    "doc1",
    "Test Document",
    [
      new Question("q1", "Question 1?", 1),
      new Question("q2", "Question 2?", 2),
    ],
    new Conversation("conv1", [
      new Message("m1", "question", "Question 1?", "q1"),
      new Message("m2", "answer", "Answer 1", "q1"),
    ])
  );
}

describe("DocumentSerializer", () => {
  it("should round-trip a document through serialization", () => {
    const original = createTestDocument();

    const dto = DocumentSerializer.toDTO(original);
    const restored = DocumentSerializer.fromDTO(dto);

    expect(restored.id).toBe(original.id);
    expect(restored.title).toBe(original.title);
    expect(restored.questionCount).toBe(original.questionCount);
    expect(restored.conversation.messageCount).toBe(original.conversation.messageCount);
    expect(restored.questions[0]?.text).toBe(original.questions[0]?.text);
  });

  it("should round-trip multiple documents", () => {
    const docs = [
      createTestDocument(),
      new Document("doc2", "Second Doc", [], new Conversation("conv2")),
    ];

    const dtos = DocumentSerializer.toDTOs(docs);
    const restored = DocumentSerializer.fromDTOs(dtos);

    expect(restored).toHaveLength(2);
    expect(restored[1]?.title).toBe("Second Doc");
  });

  it("should preserve question order", () => {
    const doc = createTestDocument();

    const dto = DocumentSerializer.toDTO(doc);
    const restored = DocumentSerializer.fromDTO(dto);

    expect(restored.questions[0]?.id).toBe("q1");
    expect(restored.questions[1]?.id).toBe("q2");
  });

  it("should preserve message-question association", () => {
    const doc = createTestDocument();

    const dto = DocumentSerializer.toDTO(doc);
    const restored = DocumentSerializer.fromDTO(dto);

    const messages = restored.conversation.getMessagesByQuestionId("q1");
    expect(messages).toHaveLength(2);
    expect(messages[0]?.type).toBe("question");
    expect(messages[1]?.type).toBe("answer");
  });
});

describe("LocalStorageDocumentRepository", () => {
  let repo: LocalStorageDocumentRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalStorageDocumentRepository();
  });

  it("should save and find a document", async () => {
    const doc = createTestDocument();

    await repo.save(doc);
    const found = await repo.findById("doc1");

    expect(found).not.toBeNull();
    expect(found!.id).toBe("doc1");
    expect(found!.title).toBe("Test Document");
    expect(found!.questionCount).toBe(2);
  });

  it("should return null for non-existent document", async () => {
    const found = await repo.findById("non-existent");

    expect(found).toBeNull();
  });

  it("should save and find all documents", async () => {
    const doc1 = createTestDocument();
    const doc2 = new Document("doc2", "Doc 2", [], new Conversation("conv2"));

    await repo.save(doc1);
    await repo.save(doc2);

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it("should return empty array when no documents", async () => {
    const all = await repo.findAll();

    expect(all).toEqual([]);
  });

  it("should update an existing document", async () => {
    const doc = createTestDocument();
    await repo.save(doc);

    doc.updateTitle("Updated Title");
    await repo.save(doc);

    const found = await repo.findById("doc1");
    expect(found!.title).toBe("Updated Title");
  });

  it("should delete a document", async () => {
    const doc = createTestDocument();
    await repo.save(doc);

    await repo.delete("doc1");

    const found = await repo.findById("doc1");
    expect(found).toBeNull();
  });

  it("should check document existence", async () => {
    const doc = createTestDocument();
    await repo.save(doc);

    expect(await repo.exists("doc1")).toBe(true);
    expect(await repo.exists("non-existent")).toBe(false);
  });
});

describe("LocalStorageSettingsRepository", () => {
  let repo: LocalStorageSettingsRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalStorageSettingsRepository();
  });

  it("should return default settings when empty", async () => {
    const settings = await repo.getSettings();

    expect(settings.darkMode).toBe(false);
  });

  it("should save and load settings", async () => {
    await repo.saveSettings({ darkMode: true });

    const loaded = await repo.getSettings();
    expect(loaded.darkMode).toBe(true);
  });

  it("should set and get individual item", async () => {
    await repo.setItem("darkMode", true);

    const value = await repo.getItem<boolean>("darkMode");
    expect(value).toBe(true);
  });

  it("should persist data across calls", async () => {
    await repo.setItem("darkMode", true);

    const value1 = await repo.getItem<boolean>("darkMode");
    expect(value1).toBe(true);

    await repo.setItem("darkMode", false);

    const value2 = await repo.getItem<boolean>("darkMode");
    expect(value2).toBe(false);
  });
});

describe("InMemoryDocumentRepository", () => {
  let repo: InMemoryDocumentRepository;
  let repo2: InMemorySettingsRepository;

  beforeEach(() => {
    repo = new InMemoryDocumentRepository();
    repo2 = new InMemorySettingsRepository();
  });

  it("should isolate data between instances", async () => {
    const doc = createTestDocument();
    await repo.save(doc);

    const otherRepo = new InMemoryDocumentRepository();
    const all = await otherRepo.findAll();
    expect(all).toEqual([]);
  });

  it("InMemorySettingsRepository should isolate data", async () => {
    await repo2.saveSettings({ darkMode: true });

    const otherRepo = new InMemorySettingsRepository();
    const settings = await otherRepo.getSettings();
    expect(settings.darkMode).toBe(false);
  });

  it("InMemoryDocumentRepository should clear data", () => {
    repo.clear();

    // should not throw
    expect(async () => await repo.findAll()).not.toThrow();
  });

  it("InMemorySettingsRepository should clear data", () => {
    repo2.clear();

    // should not throw
    expect(async () => await repo2.getSettings()).not.toThrow();
  });
});
