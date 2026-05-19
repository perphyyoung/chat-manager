import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { Document } from "@/domain/entities";
import { DocumentApplicationService } from "@/application/services/DocumentApplicationService";
import { AnswerApplicationService } from "@/application/services/AnswerApplicationService";
import { SqliteDocumentRepository } from "@/infrastructure/storage/SqliteDocumentRepository";
import { SqliteAnswerRepository } from "@/infrastructure/storage/SqliteAnswerRepository";
import { globalEventBus } from "@/domain/events";
import { mockDocuments } from "@/infrastructure/data/mockData";

const documentRepo = new SqliteDocumentRepository();
const answerRepo = new SqliteAnswerRepository();
const documentService = new DocumentApplicationService(
  documentRepo,
  globalEventBus,
);
const answerService = new AnswerApplicationService(
  documentRepo,
  answerRepo,
  globalEventBus,
);

export const useDocumentStore = defineStore("document", () => {
  const documents = ref<Document[]>([]);
  const selectedDocumentId = ref<string | null>(null);
  const activeQuestionId = ref<string | null>(null);

  const selectedDocument = computed(() => {
    return (
      documents.value.find((doc) => doc.id === selectedDocumentId.value) || null
    );
  });

  const selectedDocumentQuestions = computed(() => {
    return selectedDocument.value?.questions || [];
  });

  function selectDocument(id: string) {
    selectedDocumentId.value = id;
    activeQuestionId.value = null;
    documentService.selectDocument(id).catch(() => {});
  }

  function setActiveQuestion(id: string | null) {
    activeQuestionId.value = id;
    if (id && selectedDocumentId.value) {
      documentService
        .selectQuestion(selectedDocumentId.value, id)
        .catch(() => {});
    }
  }

  function initDocuments(docs: Document[]) {
    documents.value = docs;
  }

  async function loadDocuments() {
    const docs = await documentService.loadAllDocuments();
    if (docs.length === 0) {
      for (const mock of mockDocuments) {
        await documentRepo.save(mock);
      }
      documents.value = mockDocuments;
    } else {
      documents.value = docs;
    }
  }

  async function createDocument(title: string): Promise<void> {
    const doc = await documentService.createDocument(title);
    documents.value.push(doc);
    selectDocument(doc.id);
  }

  async function addQuestionAndAnswer(
    questionText: string,
    answerContent: string,
  ): Promise<void> {
    if (!selectedDocumentId.value) {
      throw new Error("No document selected");
    }
    const docId = selectedDocumentId.value;
    await documentService.addQuestion(docId, questionText);
    const updatedDoc = await documentService.getDocument(docId);
    if (!updatedDoc) {
      throw new Error("Document not found after adding question");
    }
    // 找到新添加的问题（最后一个）
    const newQuestion = updatedDoc.questions[updatedDoc.questions.length - 1];
    if (!newQuestion) {
      throw new Error("Failed to add question");
    }
    await answerService.addAnswer(docId, newQuestion.id, answerContent);
    // 刷新当前文档数据
    const finalDoc = await documentService.getDocument(docId);
    if (finalDoc) {
      const index = documents.value.findIndex((d) => d.id === docId);
      if (index !== -1) {
        documents.value[index] = finalDoc;
      }
    }
    setActiveQuestion(newQuestion.id);
  }

  return {
    documents,
    selectedDocumentId,
    activeQuestionId,
    selectedDocument,
    selectedDocumentQuestions,
    selectDocument,
    setActiveQuestion,
    initDocuments,
    loadDocuments,
    createDocument,
    addQuestionAndAnswer,
  };
});
