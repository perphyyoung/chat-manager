<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentStore } from '../../stores/document'
import DocumentItem from './DocumentItem.vue'

const documentStore = useDocumentStore()

const showAddDialog = ref(false)
const newDocumentTitle = ref('')
const isCreating = ref(false)

async function handleCreateDocument() {
  if (!newDocumentTitle.value.trim()) return

  isCreating.value = true
  try {
    await documentStore.createDocument(newDocumentTitle.value.trim())
    newDocumentTitle.value = ''
    showAddDialog.value = false
  } finally {
    isCreating.value = false
  }
}

function handleCancel() {
  newDocumentTitle.value = ''
  showAddDialog.value = false
}
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

    <!-- 浮动添加按钮 -->
    <button class="fab" title="添加文档" @click="showAddDialog = true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>

    <!-- 添加文档对话框 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="handleCancel">
      <div class="dialog">
        <h3>添加文档</h3>
        <input
          v-model="newDocumentTitle"
          type="text"
          placeholder="请输入文档标题"
          class="dialog-input"
          @keyup.enter="handleCreateDocument"
        />
        <div class="dialog-actions">
          <button class="btn-secondary" @click="handleCancel">取消</button>
          <button
            class="btn-primary"
            :disabled="!newDocumentTitle.trim() || isCreating"
            @click="handleCreateDocument"
          >
            {{ isCreating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-surface);
  position: relative;
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
    box-shadow 0.2s;
}

.fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.fab:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
  width: 360px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.dialog-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background-color: var(--color-background);
  color: var(--color-text);
  box-sizing: border-box;
}

.dialog-input:focus {
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
