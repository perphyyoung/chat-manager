<script setup lang="ts">
import { useDocumentStore } from '../../stores/document'
import QuestionItem from './QuestionItem.vue'

const documentStore = useDocumentStore()
</script>

<template>
  <div class="question-list">
    <div class="question-list__header">
      <h2>问题列表</h2>
    </div>
    <div class="question-list__items">
      <QuestionItem
        v-for="question in documentStore.selectedDocumentQuestions"
        :key="question.id"
        :question="question"
        :is-active="question.id === documentStore.activeQuestionId"
      />
    </div>
    <div v-if="!documentStore.selectedDocument" class="question-list__empty">
      <p>选择文档后查看问题</p>
    </div>
  </div>
</template>

<style scoped>
.question-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-surface);
}

.question-list__header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.question-list__header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.question-list__items {
  flex: 1;
  overflow-y: auto;
}

.question-list__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}
</style>
