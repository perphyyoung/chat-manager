import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Document, Question } from '../types'
import { mockDocuments } from '../data/mockData'

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<Document[]>(mockDocuments)
  const selectedDocumentId = ref<string | null>(null)
  const activeQuestionId = ref<string | null>(null)

  const selectedDocument = computed(() => {
    return documents.value.find(doc => doc.id === selectedDocumentId.value) || null
  })

  const selectedDocumentQuestions = computed((): Question[] => {
    return selectedDocument.value?.questions || []
  })

  function selectDocument(id: string) {
    selectedDocumentId.value = id
    activeQuestionId.value = null
  }

  function setActiveQuestion(id: string | null) {
    activeQuestionId.value = id
  }

  return {
    documents,
    selectedDocumentId,
    activeQuestionId,
    selectedDocument,
    selectedDocumentQuestions,
    selectDocument,
    setActiveQuestion
  }
})
