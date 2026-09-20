<script setup lang="ts">
import TagBadge from "../common/TagBadge.vue";

interface TagProp {
  id: string;
  name: string;
}

interface DocumentProp {
  id: string;
  title: string;
  questions: readonly {
    id: string;
    text: string;
    order: number;
  }[];
  activeQuestions: readonly {
    id: string;
    text: string;
    order: number;
  }[];
  tags?: readonly TagProp[];
}

interface Props {
  document: DocumentProp;
  isActive: boolean;
  isDragOver?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  contextmenu: [event: MouseEvent, documentId: string];
  dragOver: [documentId: string];
  dragLeave: [];
  drop: [documentId: string];
}>();

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  emit("contextmenu", event, props.document.id);
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  emit("dragOver", props.document.id);
}

function handleDragLeave(event: DragEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    emit("dragLeave");
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  emit("drop", props.document.id);
}
</script>

<template>
  <div
    class="document-item"
    :class="{
      'document-item--active': isActive,
      'document-item--drag-over': isDragOver,
    }"
    @contextmenu="handleContextMenu"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="document-item__content">
      <div class="document-item__title-row">
        <span class="document-item__title">{{ document.title }}</span>
        <span v-if="document.activeQuestions.length" class="document-item__count">
          {{ document.activeQuestions.length }}
        </span>
      </div>
      <div v-if="document.tags?.length" class="document-item__tags">
        <TagBadge v-for="tag in document.tags.slice(0, 2)" :key="tag.id" :name="tag.name" />
        <span v-if="(document.tags.length || 0) > 2" class="document-item__more-tags">
          +{{ document.tags.length - 2 }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--color-border);
}

.document-item:hover {
  background-color: var(--color-hover);
}

.document-item--active {
  background-color: var(--color-active);
  border-left: 3px solid var(--color-primary);
}

.document-item--drag-over {
  background-color: var(--color-primary-light, rgba(59, 130, 246, 0.15));
  outline: 2px dashed var(--color-primary);
  outline-offset: -2px;
}

.document-item__content {
  flex: 1;
  min-width: 0;
}

.document-item__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.document-item__title {
  flex: 0 1 auto;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 问题数量胶囊计数（与标签计数样式一致） */
.document-item__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background-color: var(--color-primary, #3b82f6);
  color: white;
  border-radius: 7px;
  font-size: 9px;
  font-weight: 600;
  flex-shrink: 0;
}

.document-item__tags {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.document-item__more-tags {
  font-size: 11px;
  color: var(--color-text-secondary);
}
</style>
