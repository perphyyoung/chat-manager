import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach } from "vitest";
import { useDocumentStore } from "./document";
import { Document, Question, Conversation, Message } from "@/domain/entities";

function createTestDocument(id: string, title: string): Document {
  return new Document(
    id,
    title,
    [
      new Question(`${id}-q1`, "Question 1", 1),
      new Question(`${id}-q2`, "Question 2", 2),
    ],
    new Conversation(`${id}-conv`, [
      new Message(`${id}-m1`, "question", "Q1", `${id}-q1`),
      new Message(`${id}-m2`, "answer", "A1"),
    ])
  );
}

describe("useDocumentStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("initial state", () => {
    it("should have empty documents by default", () => {
      const store = useDocumentStore();
      expect(store.documents).toEqual([]);
      expect(store.selectedDocumentId).toBeNull();
      expect(store.activeQuestionId).toBeNull();
    });
  });

  describe("with test data", () => {
    it("should initialize with provided documents", () => {
      const store = useDocumentStore();
      const testDoc = createTestDocument("1", "Doc 1");
      store.initDocuments([testDoc]);

      expect(store.documents).toEqual([testDoc]);
    });

    it("should select a document", () => {
      const store = useDocumentStore();
      const testDoc = createTestDocument("1", "Doc 1");
      store.initDocuments([testDoc]);

      store.selectDocument(testDoc.id);

      expect(store.selectedDocumentId).toBe(testDoc.id);
      expect(store.selectedDocument?.id).toBe(testDoc.id);
    });

    it("should reset activeQuestion when selecting a new document", () => {
      const store = useDocumentStore();
      const testDoc = createTestDocument("1", "Doc 1");
      store.initDocuments([testDoc]);

      store.setActiveQuestion("some-question-id");
      store.selectDocument(testDoc.id);

      expect(store.activeQuestionId).toBeNull();
    });

    it("should return selected document questions", () => {
      const store = useDocumentStore();
      const testDoc = createTestDocument("1", "Doc 1");
      store.initDocuments([testDoc]);

      store.selectDocument(testDoc.id);

      expect(store.selectedDocumentQuestions).toHaveLength(2);
      expect(store.selectedDocumentQuestions[0]?.text).toBe("Question 1");
    });

    it("should return empty questions when no document selected", () => {
      const store = useDocumentStore();
      expect(store.selectedDocumentQuestions).toEqual([]);
    });
  });

  describe("question management", () => {
    it("should set active question", () => {
      const store = useDocumentStore();
      const questionId = "test-question-id";

      store.setActiveQuestion(questionId);

      expect(store.activeQuestionId).toBe(questionId);
    });

    it("should clear active question when passed null", () => {
      const store = useDocumentStore();

      store.setActiveQuestion("some-id");
      store.setActiveQuestion(null);

      expect(store.activeQuestionId).toBeNull();
    });
  });

  describe("computed properties", () => {
    it("should return null for selectedDocument when nothing selected", () => {
      const store = useDocumentStore();
      expect(store.selectedDocument).toBeNull();
    });

    it("should find document by id", () => {
      const store = useDocumentStore();
      const testDocs = [
        createTestDocument("1", "Doc 1"),
        createTestDocument("2", "Doc 2"),
      ];
      store.initDocuments(testDocs);

      store.selectDocument("2");

      expect(store.selectedDocument?.title).toBe("Doc 2");
    });
  });
});
