<script setup lang="ts">
import { ref, watch } from 'vue'

// 使用接口而不是直接导入 Answer 类，避免类型不匹配
interface AnswerViewModel {
  id: string
  questionId: string
  content: string
  createdAt: Date
  updatedAt: Date
  editContent: (newContent: string) => void
}

interface Props {
  answer: AnswerViewModel
}

const props = defineProps<Props>()

const isEditing = ref(false)
const editContent = ref('')

watch(() => props.answer, (newAnswer) => {
  editContent.value = newAnswer.content
}, { immediate: true })

function startEdit() {
  editContent.value = props.answer.content
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  editContent.value = props.answer.content
}

function saveEdit() {
  // TODO: 调用应用服务保存编辑
  props.answer.editContent(editContent.value)
  isEditing.value = false
}
</script>

<template>
  <div class="answer-editor">
    <div v-if="!isEditing" class="answer-editor__display">
      <div class="answer-editor__content">{{ answer.content }}</div>
      <div class="answer-editor__actions">
        <button class="btn-edit" @click="startEdit">编辑</button>
      </div>
    </div>
    <div v-else class="answer-editor__edit">
      <textarea
        v-model="editContent"
        class="answer-editor__textarea"
        rows="4"
      />
      <div class="answer-editor__actions">
        <button class="btn-save" @click="saveEdit">保存</button>
        <button class="btn-cancel" @click="cancelEdit">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.answer-editor {
  padding: 16px;
  background-color: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.answer-editor__display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-editor__content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text);
  white-space: pre-wrap;
}

.answer-editor__edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-editor__textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  background-color: var(--color-background);
  color: var(--color-text);
}

.answer-editor__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-edit,
.btn-save,
.btn-cancel {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-edit {
  background-color: var(--color-primary);
  color: white;
}

.btn-edit:hover {
  background-color: var(--color-primary-hover);
}

.btn-save {
  background-color: var(--color-success);
  color: white;
}

.btn-save:hover {
  background-color: var(--color-success-hover);
}

.btn-cancel {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover {
  background-color: var(--color-border);
}
</style>
