import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { Document } from "@/domain/entities";
import { DocumentApplicationService } from "@/application/services/DocumentApplicationService";
import { LocalStorageDocumentRepository } from "@/infrastructure/storage/LocalStorageDocumentRepository";
import { globalEventBus } from "@/domain/events";

const documentRepo = new LocalStorageDocumentRepository();
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
    documents.value = docs;
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
