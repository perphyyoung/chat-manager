import { setActivePinia, createPinia } from "pinia";
import { describe, it, expect, beforeEach } from "vitest";
import { useDocumentStore } from "./document";
import type { Document } from "../types";

function createTestDocument(id: string, title: string): Document {
  return {
    id,
    title,
    questions: [
      { id: `${id}-q1`, text: "Question 1", order: 1 },
      { id: `${id}-q2`, text: "Question 2", order: 2 },
    ],
    conversation: {
      id: `${id}-conv`,
      messages: [
        {
          id: `${id}-m1`,
          type: "question",
          content: "Q1",
          questionId: `${id}-q1`,
        },
        { id: `${id}-m2`, type: "answer", content: "A1" },
      ],
    },
  };
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

      expect(store.selectedDocumentQuestions).toEqual(testDoc.questions);
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
