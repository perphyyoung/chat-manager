<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, inject } from "vue";
import { useDocumentStore, type QuestionSortField } from "../../stores/document";
import QuestionItem from "./QuestionItem.vue";
import RecycleBinModal from "../common/RecycleBinModal.vue";
import RecycleBinButton from "../common/RecycleBinButton.vue";
import AddFabButton from "../common/AddFabButton.vue";
import ContextMenu, { type MenuItem } from "../common/ContextMenu.vue";
import DropdownMenu from "../common/DropdownMenu.vue";

const showToast = inject<(message: string) => void>("showToast");

const documentStore = useDocumentStore();

const showAddDialog = ref(false);
const newQuestionText = ref("");
const newAnswerContent = ref("");
const isCreating = ref(false);
const sortMenu = ref<InstanceType<typeof DropdownMenu> | null>(null);
const iconOpen = computed(() => sortMenu.value?.isOpen ?? false);
const showRecycleBin = ref(false);

// 问题输入框 ref，用于弹窗打开时聚焦
const questionInput = ref<HTMLInputElement | null>(null);

// 问题列表容器 ref，用于高亮项滚动
const itemsContainer = ref<HTMLElement | null>(null);

// 弹窗打开时聚焦到问题输入框
watch(showAddDialog, async (show) => {
  if (show) {
    await nextTick();
    questionInput.value?.focus();
  }
});

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
});

// 右键菜单项
const contextMenuItems = computed<MenuItem[]>(() => [
  {
    text: "复制",
    action: handleCopyClick,
  },
  {
    text: "编辑问题",
    action: handleEditClick,
  },
  {
    text: "重新排序",
    action: handleReorderClick,
  },
  {
    text: "删除问题",
    action: handleDeleteClick,
    danger: true,
  },
]);

// 当前右键选中的问题信息
const currentQuestion = ref({
  questionId: "",
  questionText: "",
});

// 编辑对话框状态
const showEditDialog = ref(false);
const editQuestionText = ref("");
const isEditing = ref(false);

// 编辑问题输入框 ref，用于弹窗打开时聚焦
const editQuestionInput = ref<HTMLInputElement | null>(null);

// 编辑弹窗打开时聚焦到输入框
watch(showEditDialog, async (show) => {
  if (show) {
    await nextTick();
    editQuestionInput.value?.focus();
  }
});

// 拖拽状态
const dragState = ref({
  draggingId: null as string | null,
  dropTargetId: null as string | null,
});

const sortFieldLabels: Record<QuestionSortField, string> = {
  createdAt: "创建时间",
  updatedAt: "更新时间",
  title: "名称",
  sortOrder: "出现顺序",
};

function scrollToActiveQuestion() {
  nextTick(() => {
    const container = itemsContainer.value;
    const activeId = documentStore.activeQuestionId;
    if (!container || !activeId) return;

    const targetElement = container.querySelector(`[data-question-id="${activeId}"]`);
    targetElement?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

watch(() => documentStore.activeQuestionId, scrollToActiveQuestion);

async function handleCreateQA() {
  const questionText = newQuestionText.value.trim();
  const answerText = newAnswerContent.value.trim();

  if (!questionText || !answerText) {
    return;
  }

  isCreating.value = true;
  try {
    await documentStore.addQuestionAndAnswer(questionText, answerText);
    newQuestionText.value = "";
    newAnswerContent.value = "";
    showAddDialog.value = false;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    window.electronAPI.renderLog("error", `[QuestionList] 创建问答失败: ${errorMsg}`);
  } finally {
    isCreating.value = false;
  }
}

function closeAddDialog() {
  newQuestionText.value = "";
  newAnswerContent.value = "";
  showAddDialog.value = false;
}

function handleSortFieldChange(field: QuestionSortField) {
  documentStore.setQuestionSortField(field);
  sortMenu.value?.close();
}

function handleQuestionClick(questionId: string) {
  documentStore.setActiveQuestion(questionId);
}

// 右键菜单处理
function handleContextMenu(event: MouseEvent, questionId: string) {
  const question = documentStore.selectedDocument?.getQuestionById(questionId);
  if (!question) return;

  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
  };
  currentQuestion.value = {
    questionId,
    questionText: question.text,
  };
}

// 复制问题
async function handleCopyClick() {
  const text = currentQuestion.value.questionText;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showToast?.("问题已复制");
  } catch {
    showToast?.("复制失败");
  }
  contextMenu.value.show = false;
}

// 删除问题 - 软删除到回收站
async function handleDeleteClick() {
  if (!currentQuestion.value.questionId) return;
  await documentStore.softDeleteQuestion(currentQuestion.value.questionId);
  await documentStore.loadDeletedQuestions(); // 立即更新回收站计数
  contextMenu.value.show = false;
  currentQuestion.value.questionId = "";
  currentQuestion.value.questionText = "";
}

// 编辑功能
function handleEditClick() {
  contextMenu.value.show = false;
  editQuestionText.value = currentQuestion.value.questionText;
  showEditDialog.value = true;
}

async function confirmEdit() {
  if (!currentQuestion.value.questionId || !editQuestionText.value.trim()) return;

  isEditing.value = true;
  try {
    await documentStore.updateQuestionText(
      currentQuestion.value.questionId,
      editQuestionText.value.trim(),
    );
    showEditDialog.value = false;
    editQuestionText.value = "";
    currentQuestion.value.questionId = "";
    currentQuestion.value.questionText = "";
  } finally {
    isEditing.value = false;
  }
}

function cancelEdit() {
  showEditDialog.value = false;
  editQuestionText.value = "";
  currentQuestion.value.questionId = "";
  currentQuestion.value.questionText = "";
}

// 重新排序问题
async function handleReorderClick() {
  contextMenu.value.show = false;
  try {
    await documentStore.reorderQuestions();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    window.electronAPI.renderLog("error", `[QuestionList] 重新排序失败: ${errorMsg}`);
  }
}

// 拖拽开始
function handleDragStart(questionId: string) {
  dragState.value.draggingId = questionId;
  // 保存到全局，供 DocumentList 获取
  (window as unknown as { __draggedQuestionId?: string }).__draggedQuestionId = questionId;
}

// 拖拽结束
function handleDragEnd() {
  dragState.value.draggingId = null;
  dragState.value.dropTargetId = null;
  // 清除全局
  delete (window as unknown as { __draggedQuestionId?: string }).__draggedQuestionId;
}

// 拖拽进入目标
function handleDragEnter(targetId: string) {
  if (dragState.value.draggingId && dragState.value.draggingId !== targetId) {
    dragState.value.dropTargetId = targetId;
  }
}

// 拖拽离开目标
function handleDragLeave() {
  dragState.value.dropTargetId = null;
}

// 放置
async function handleDrop(targetId: string) {
  const sourceId = dragState.value.draggingId;
  if (!sourceId || sourceId === targetId) {
    handleDragEnd();
    return;
  }

  try {
    await documentStore.moveQuestion(sourceId, targetId);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    window.electronAPI.renderLog("error", `[QuestionList] 拖拽排序失败: ${errorMsg}`);
  } finally {
    handleDragEnd();
  }
}

onMounted(async () => {
  await documentStore.loadDeletedQuestions();
  scrollToActiveQuestion();
});
</script>

<template>
  <div class="question-list">
    <div class="question-list__header">
      <h2>问题列表</h2>
      <div v-if="documentStore.selectedDocument" class="sort-controls">
        <div class="sort-field-wrapper" style="position: relative">
          <button class="sort-field-btn" @click="sortMenu?.toggle">
            {{ sortFieldLabels[documentStore.questionSortField] }}
            <svg
              class="dropdown-icon"
              :class="{ open: iconOpen }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <DropdownMenu
            ref="sortMenu"
            :items="
              Object.entries(sortFieldLabels).map(([value, label]) => ({
                value,
                label,
              }))
            "
            :active-value="documentStore.questionSortField"
            @select="(v: string) => handleSortFieldChange(v as QuestionSortField)"
          />
        </div>
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
      </div>
    </div>
    <div ref="itemsContainer" class="question-list__items">
      <QuestionItem
        v-for="question in documentStore.selectedDocumentQuestions"
        :key="question.id"
        :question="question"
        :is-active="question.id === documentStore.activeQuestionId"
        :is-dragging="dragState.draggingId === question.id"
        :is-drop-target="dragState.dropTargetId === question.id"
        @click="handleQuestionClick"
        @context-menu="handleContextMenu"
        @drag-start="handleDragStart"
        @drag-end="handleDragEnd"
        @drag-enter="handleDragEnter"
        @drag-leave="handleDragLeave"
        @drop="handleDrop"
      />
    </div>
    <div v-if="!documentStore.selectedDocument" class="question-list__empty">
      <p>选择文档后查看问题</p>
    </div>

    <!-- 浮动添加按钮 -->
    <AddFabButton
      title="添加问答对"
      :disabled="!documentStore.selectedDocument"
      @click="showAddDialog = true"
    />

    <!-- 回收站按钮 -->
    <RecycleBinButton
      v-if="documentStore.selectedDocument"
      :count="documentStore.deletedQuestionCount"
      title="回收站"
      @click="
        showRecycleBin = true;
        documentStore.loadDeletedQuestions();
      "
    />

    <!-- 回收站弹窗 -->
    <RecycleBinModal
      :show="showRecycleBin"
      title="问题回收站"
      :items="
        documentStore.deletedQuestions.map((q) => ({
          id: q.id,
          name: q.text,
          deletedAt: q.deletedAt,
          type: 'question',
        }))
      "
      @close="showRecycleBin = false"
      @restore="(id) => documentStore.restoreQuestion(id)"
      @delete="(id) => documentStore.permanentlyDeleteQuestion(id)"
      @clear="
        () => {
          documentStore.clearDeletedQuestions();
        }
      "
    />

    <!-- 添加问答对对话框 -->
    <div v-if="showAddDialog" class="add-question-model">
      <div class="dialog">
        <h3>添加问答对</h3>
        <div class="dialog-field">
          <label>问题</label>
          <input
            ref="questionInput"
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
          <button class="btn-secondary" @click="closeAddDialog">取消</button>
          <button
            class="btn-primary"
            :disabled="!newQuestionText.trim() || !newAnswerContent.trim() || isCreating"
            @click="handleCreateQA"
          >
            {{ isCreating ? "创建中..." : "创建" }}
          </button>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @close="contextMenu.show = false"
    />

    <!-- 编辑问题对话框 -->
    <div v-if="showEditDialog" class="add-question-model">
      <div class="dialog">
        <h3>编辑问题</h3>
        <div class="dialog-field">
          <label>问题文本</label>
          <input
            ref="editQuestionInput"
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
            {{ isEditing ? "保存中..." : "保存" }}
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

/* 对话框样式 */
.add-question-model {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
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
</style>
