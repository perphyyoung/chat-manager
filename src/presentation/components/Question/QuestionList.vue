<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentStore } from '../../stores/document'
import QuestionItem from './QuestionItem.vue'

const documentStore = useDocumentStore()

const showAddDialog = ref(false)
const newQuestionText = ref('')
const newAnswerContent = ref('')
const isCreating = ref(false)

async function handleCreateQA() {
  if (!newQuestionText.value.trim() || !newAnswerContent.value.trim()) return

  isCreating.value = true
  try {
    await documentStore.addQuestionAndAnswer(
      newQuestionText.value.trim(),
      newAnswerContent.value.trim(),
    )
    newQuestionText.value = ''
    newAnswerContent.value = ''
    showAddDialog.value = false
  } finally {
    isCreating.value = false
  }
}

function handleCancel() {
  newQuestionText.value = ''
  newAnswerContent.value = ''
  showAddDialog.value = false
}
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

    <!-- 浮动添加按钮 -->
    <button
      class="fab"
      title="添加问答对"
      :disabled="!documentStore.selectedDocument"
      @click="showAddDialog = true"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>

    <!-- 添加问答对对话框 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="handleCancel">
      <div class="dialog">
        <h3>添加问答对</h3>
        <div class="dialog-field">
          <label>问题</label>
          <input
            v-model="newQuestionText"
            type="text"
            placeholder="请输入问题"
            class="dialog-input"
          />
        </div>
        <div class="dialog-field">
          <label>回答</label>
          <textarea
            v-model="newAnswerContent"
            placeholder="请输入回答"
            class="dialog-textarea"
            rows="4"
          />
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="handleCancel">取消</button>
          <button
            class="btn-primary"
            :disabled="!newQuestionText.trim() || !newAnswerContent.trim() || isCreating"
            @click="handleCreateQA"
          >
            {{ isCreating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-surface);
  position: relative;
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

/* 浮动操作按钮 */
.fab {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    opacity 0.2s;
}

.fab:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.fab:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.fab:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
}

.fab svg {
  width: 24px;
  height: 24px;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background-color: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.dialog-field {
  margin-bottom: 16px;
}

.dialog-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.dialog-input,
.dialog-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background-color: var(--color-background);
  color: var(--color-text);
  box-sizing: border-box;
  font-family: inherit;
}

.dialog-textarea {
  resize: vertical;
  min-height: 80px;
}

.dialog-input:focus,
.dialog-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background-color: transparent;
  color: var(--color-text);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background-color: var(--color-background);
}

.btn-primary {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: var(--color-primary);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
