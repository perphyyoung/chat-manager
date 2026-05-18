<script setup lang="ts">
import { useDocumentStore } from '../../stores/document'
import DocumentItem from './DocumentItem.vue'

const documentStore = useDocumentStore()
</script>

<template>
  <div class="document-list">
    <div class="document-list__header">
      <h2>文档列表</h2>
    </div>
    <div class="document-list__items">
      <DocumentItem
        v-for="doc in documentStore.documents"
        :key="doc.id"
        :document="doc"
        :is-active="doc.id === documentStore.selectedDocumentId"
        @click="documentStore.selectDocument(doc.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.document-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-surface);
}

.document-list__header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.document-list__header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.document-list__items {
  flex: 1;
  overflow-y: auto;
}
</style>
