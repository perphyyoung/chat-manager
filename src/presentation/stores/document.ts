import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { Document } from "@/domain/entities";
import { DocumentApplicationService } from "@/application/services/DocumentApplicationService";
import { SqliteDocumentRepository } from "@/infrastructure/storage/SqliteDocumentRepository";
import { globalEventBus } from "@/domain/events";
import { mockDocuments } from "@/infrastructure/data/mockData";

const documentRepo = new SqliteDocumentRepository();
const documentService = new DocumentApplicationService(
  documentRepo,
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
  };
});
