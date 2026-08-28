<script setup lang="ts">
interface QuestionProp {
  id: string;
  text: string;
  order: number;
}

interface Props {
  question: QuestionProp;
  isActive: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  click: [questionId: string];
  contextMenu: [event: MouseEvent, questionId: string];
  dragStart: [questionId: string];
  dragEnd: [];
  drop: [targetId: string];
  dragEnter: [targetId: string];
  dragLeave: [];
}>();

function handleClick() {
  emit("click", props.question.id);
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  emit("contextMenu", event, props.question.id);
}

function handleDragStart(event: DragEvent) {
  emit("dragStart", props.question.id);
  // 设置拖拽效果和数据
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", props.question.id);
  }
}

function handleDragEnd() {
  emit("dragEnd");
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault();
  emit("dragEnter", props.question.id);
}

function handleDragLeave(event: DragEvent) {
  // 检查是否真的离开了元素（而不是进入了子元素）
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    emit("dragLeave");
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  emit("drop", props.question.id);
}
</script>

<template>
  <div
    class="question-item"
    :class="{
      'question-item--active': isActive,
      'question-item--dragging': isDragging,
      'question-item--drop-target': isDropTarget,
    }"
    :data-question-id="question.id"
    draggable="true"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="question-item__number">
      {{ question.order }}
    </div>
    <div class="question-item__text">
      {{ question.text }}
    </div>
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

.question-item--dragging {
  opacity: 0.6;
  background-color: var(--color-primary-light, rgba(59, 130, 246, 0.1));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: scale(1.02);
}

.question-item--drop-target {
  position: relative;
}

.question-item--drop-target::before {
  content: "";
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light, #60a5fa));
  border-radius: 2px;
  animation: dropIndicator 0.2s ease;
  z-index: 1;
}

@keyframes dropIndicator {
  from {
    transform: scaleX(0);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
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
