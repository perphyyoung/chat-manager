<script setup lang="ts">
import type { Document } from '../../types'

interface Props {
  document: Document
  isActive: boolean
}

defineProps<Props>()
</script>

<template>
  <div
    class="document-item"
    :class="{ 'document-item--active': isActive }"
  >
    <div class="document-item__icon">📄</div>
    <div class="document-item__content">
      <div class="document-item__title">{{ document.title }}</div>
      <div class="document-item__meta">
        {{ document.questions.length }} 个问题
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

.document-item__icon {
  font-size: 24px;
  margin-right: 12px;
}

.document-item__content {
  flex: 1;
  min-width: 0;
}

.document-item__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-item__meta {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}
</style>
