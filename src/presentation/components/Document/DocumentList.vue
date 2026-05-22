<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useDocumentStore, type SortField } from '../../stores/document'
import DocumentItem from './DocumentItem.vue'
import DocumentContextMenu from './DocumentContextMenu.vue'

const documentStore = useDocumentStore()

const showAddDialog = ref(false)
const newDocumentTitle = ref('')
const isCreating = ref(false)
const showSortMenu = ref(false)
const titleInputRef = ref<HTMLInputElement | null>(null)

// 右键菜单状态
const contextMenu = ref<{
  show: boolean
  x: number
  y: number
  documentId: string | null
}>({
  show: false,
  x: 0,
  y: 0,
  documentId: null,
})

// 编辑对话框状态
const showEditDialog = ref(false)
const editDocumentTitle = ref('')
const isEditing = ref(false)
const editingDocumentId = ref<string | null>(null)

// 删除确认对话框状态
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)
const deletingDocumentId = ref<string | null>(null)

const sortFieldLabels: Record<SortField, string> = {
  createdAt: '创建时间',
  updatedAt: '更新时间',
  title: '标题',
}

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

// 对话框打开时自动聚焦到输入框
watch(showAddDialog, (newValue) => {
  if (newValue) {
    nextTick(() => {
      titleInputRef.value?.focus()
    })
  }
})

function handleSortFieldChange(field: SortField) {
  documentStore.setDocumentSortField(field)
  showSortMenu.value = false
}

// 右键菜单处理
function handleContextMenu(event: MouseEvent, documentId: string) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    documentId,
  }
}

function closeContextMenu() {
  contextMenu.value.show = false
  contextMenu.value.documentId = null
}

// 编辑文档
function handleEditDocument() {
  if (!contextMenu.value.documentId) return
  const doc = documentStore.documents.find((d) => d.id === contextMenu.value.documentId)
  if (doc) {
    editingDocumentId.value = doc.id
    editDocumentTitle.value = doc.title
    showEditDialog.value = true
  }
  closeContextMenu()
}

async function handleUpdateDocument() {
  if (!editDocumentTitle.value.trim() || !editingDocumentId.value) return

  isEditing.value = true
  try {
    await documentStore.updateDocumentTitle(editingDocumentId.value, editDocumentTitle.value.trim())
    showEditDialog.value = false
    editDocumentTitle.value = ''
    editingDocumentId.value = null
  } finally {
    isEditing.value = false
  }
}

function handleCancelEdit() {
  editDocumentTitle.value = ''
  editingDocumentId.value = null
  showEditDialog.value = false
}

// 删除文档
function handleDeleteDocument() {
  if (!contextMenu.value.documentId) return
  deletingDocumentId.value = contextMenu.value.documentId
  showDeleteConfirm.value = true
  closeContextMenu()
}

async function confirmDeleteDocument() {
  if (!deletingDocumentId.value) return

  isDeleting.value = true
  try {
    await documentStore.deleteDocument(deletingDocumentId.value)
    showDeleteConfirm.value = false
    deletingDocumentId.value = null
  } finally {
    isDeleting.value = false
  }
}

function cancelDeleteDocument() {
  showDeleteConfirm.value = false
  deletingDocumentId.value = null
}
</script>

<template>
  <div class="document-list">
    <div class="document-list__header">
      <h2>文档列表</h2>
      <div class="sort-controls">
        <button
          class="sort-order-btn"
          :title="documentStore.documentSortOrder === 'asc' ? '升序' : '降序'"
          @click="documentStore.toggleDocumentSortOrder()"
        >
          <svg
            v-if="documentStore.documentSortOrder === 'asc'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="5 12 12 19 19 12"></polyline>
          </svg>
        </button>
        <div class="sort-field-wrapper">
          <button class="sort-field-btn" @click="showSortMenu = !showSortMenu">
            {{ sortFieldLabels[documentStore.documentSortField] }}
            <svg
              class="dropdown-icon"
              :class="{ open: showSortMenu }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div v-if="showSortMenu" class="sort-menu">
            <button
              v-for="(label, field) in sortFieldLabels"
              :key="field"
              class="sort-menu-item"
              :class="{ active: documentStore.documentSortField === field }"
              @click="handleSortFieldChange(field)"
            >
              {{ label }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="document-list__items">
      <DocumentItem
        v-for="doc in documentStore.sortedDocuments"
        :key="doc.id"
        :document="doc"
        :is-active="doc.id === documentStore.selectedDocumentId"
        @click="documentStore.selectDocument(doc.id)"
        @contextmenu="handleContextMenu"
      />
    </div>

    <!-- 右键菜单 -->
    <DocumentContextMenu
      v-if="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @edit="handleEditDocument"
      @delete="handleDeleteDocument"
      @close="closeContextMenu"
    />

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
          ref="titleInputRef"
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

    <!-- 编辑文档对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" @click.self="handleCancelEdit">
      <div class="dialog">
        <h3>编辑文档标题</h3>
        <input
          v-model="editDocumentTitle"
          type="text"
          placeholder="请输入文档标题"
          class="dialog-input"
          @keyup.enter="handleUpdateDocument"
        />
        <div class="dialog-actions">
          <button class="btn-secondary" @click="handleCancelEdit">取消</button>
          <button
            class="btn-primary"
            :disabled="!editDocumentTitle.trim() || isEditing"
            @click="handleUpdateDocument"
          >
            {{ isEditing ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="cancelDeleteDocument">
      <div class="dialog dialog--confirm">
        <h3>确认删除</h3>
        <p class="confirm-message">确定要删除这个文档吗？此操作不可恢复。</p>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="cancelDeleteDocument">取消</button>
          <button class="btn-danger" :disabled="isDeleting" @click="confirmDeleteDocument">
            {{ isDeleting ? '删除中...' : '删除' }}
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.document-list__header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-order-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.sort-order-btn:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.sort-order-btn svg {
  width: 16px;
  height: 16px;
}

.sort-field-wrapper {
  position: relative;
}

.sort-field-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.sort-field-btn:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.dropdown-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.2s;
}

.dropdown-icon.open {
  transform: rotate(180deg);
}

.sort-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 100px;
  z-index: 100;
  overflow: hidden;
}

.sort-menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background-color: transparent;
  color: var(--color-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sort-menu-item:hover {
  background-color: var(--color-hover);
}

.sort-menu-item.active {
  color: var(--color-primary);
  font-weight: 500;
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

/* 删除按钮 */
.btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: #ef4444;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-danger:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 确认对话框 */
.dialog--confirm {
  max-width: 360px;
}

.confirm-message {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.6;
}
</style>
