<script setup lang="ts">
interface QuestionProp {
  id: string
  text: string
  order: number
}

interface Props {
  question: QuestionProp
  isActive: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: [questionId: string]
  contextMenu: [event: MouseEvent, questionId: string]
}>()

function handleClick() {
  emit('click', props.question.id)
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault()
  emit('contextMenu', event, props.question.id)
}
</script>

<template>
  <div
    class="question-item"
    :class="{ 'question-item--active': isActive }"
    :data-question-id="question.id"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <div class="question-item__number">{{ question.order }}</div>
    <div class="question-item__text">{{ question.text }}</div>
  </div>
</template>

<style scoped>
.question-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--color-border);
}

.question-item:hover {
  background-color: var(--color-hover);
}

.question-item--active {
  background-color: var(--color-active);
  border-left: 3px solid var(--color-primary);
}

.question-item__number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.question-item__text {
  flex: 1;
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.4;
}
</style>
