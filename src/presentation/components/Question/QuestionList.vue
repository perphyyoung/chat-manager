<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentStore, type QuestionSortField } from '../../stores/document'
import QuestionItem from './QuestionItem.vue'

const documentStore = useDocumentStore()

const showAddDialog = ref(false)
const newQuestionText = ref('')
const newAnswerContent = ref('')
const isCreating = ref(false)
const showSortMenu = ref(false)

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  questionId: '',
  questionText: '',
})

// 删除确认对话框状态
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)

// 编辑对话框状态
const showEditDialog = ref(false)
const editQuestionText = ref('')
const isEditing = ref(false)

const sortFieldLabels: Record<QuestionSortField, string> = {
  createdAt: '创建时间',
  updatedAt: '更新时间',
  title: '文本',
  sortOrder: '出现顺序',
}

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

function handleSortFieldChange(field: QuestionSortField) {
  documentStore.setQuestionSortField(field)
  showSortMenu.value = false
}

function handleQuestionClick(questionId: string) {
  documentStore.setActiveQuestion(questionId)
}

// 右键菜单处理
function handleContextMenu(event: MouseEvent, questionId: string) {
  const question = documentStore.selectedDocument?.getQuestionById(questionId)
  if (!question) return

  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    questionId,
    questionText: question.text,
  }
}

// 删除功能
function handleDeleteClick() {
  contextMenu.value.show = false
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!contextMenu.value.questionId) return

  isDeleting.value = true
  try {
    await documentStore.deleteQuestionAndAnswer(contextMenu.value.questionId)
    showDeleteConfirm.value = false
    contextMenu.value.questionId = ''
    contextMenu.value.questionText = ''
  } finally {
    isDeleting.value = false
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  contextMenu.value.questionId = ''
  contextMenu.value.questionText = ''
}

// 编辑功能
function handleEditClick() {
  contextMenu.value.show = false
  editQuestionText.value = contextMenu.value.questionText
  showEditDialog.value = true
}

async function confirmEdit() {
  if (!contextMenu.value.questionId || !editQuestionText.value.trim()) return

  isEditing.value = true
  try {
    await documentStore.updateQuestionText(
      contextMenu.value.questionId,
      editQuestionText.value.trim(),
    )
    showEditDialog.value = false
    editQuestionText.value = ''
    contextMenu.value.questionId = ''
    contextMenu.value.questionText = ''
  } finally {
    isEditing.value = false
  }
}

function cancelEdit() {
  showEditDialog.value = false
  editQuestionText.value = ''
  contextMenu.value.questionId = ''
  contextMenu.value.questionText = ''
}
</script>

<template>
  <div class="question-list">
    <div class="question-list__header">
      <h2>问题列表</h2>
      <div v-if="documentStore.selectedDocument" class="sort-controls">
        <button
          class="sort-order-btn"
          :title="documentStore.questionSortOrder === 'asc' ? '升序' : '降序'"
          @click="documentStore.toggleQuestionSortOrder()"
        >
          <svg
            v-if="documentStore.questionSortOrder === 'asc'"
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
            {{ sortFieldLabels[documentStore.questionSortField] }}
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
              :class="{ active: documentStore.questionSortField === field }"
              @click="handleSortFieldChange(field)"
            >
              {{ label }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="question-list__items">
      <QuestionItem
        v-for="question in documentStore.selectedDocumentQuestions"
        :key="question.id"
        :question="question"
        :is-active="question.id === documentStore.activeQuestionId"
        @click="handleQuestionClick"
        @context-menu="handleContextMenu"
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

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenu.show"
        class="context-menu"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        @click.stop
      >
        <button class="menu-item" @click="handleEditClick">编辑问题</button>
        <button class="menu-item menu-item--danger" @click="handleDeleteClick">删除问题</button>
      </div>
    </Teleport>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="cancelDelete">
      <div class="dialog dialog--confirm">
        <h3>确认删除</h3>
        <p class="confirm-message">
          确定要删除问题 "<strong>{{ contextMenu.questionText }}</strong
          >" 吗？<br />
          对应的回答也将被一并删除。
        </p>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="cancelDelete">取消</button>
          <button class="btn-danger" :disabled="isDeleting" @click="confirmDelete">
            {{ isDeleting ? '删除中...' : '删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑问题对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" @click.self="cancelEdit">
      <div class="dialog">
        <h3>编辑问题</h3>
        <div class="dialog-field">
          <label>问题文本</label>
          <input
            v-model="editQuestionText"
            type="text"
            placeholder="请输入问题"
            class="dialog-input"
            @keyup.enter="confirmEdit"
          />
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary" @click="cancelEdit">取消</button>
          <button
            class="btn-primary"
            :disabled="!editQuestionText.trim() || isEditing"
            @click="confirmEdit"
          >
            {{ isEditing ? '保存中...' : '保存' }}
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.question-list__header h2 {
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

.confirm-message strong {
  color: var(--color-primary);
}

/* 右键菜单 */
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}

.context-menu {
  position: fixed;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 140px;
  z-index: 1000;
  overflow: hidden;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background-color: transparent;
  color: var(--color-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: var(--color-hover);
}

.menu-item--danger {
  color: #ef4444;
}

.menu-item--danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
