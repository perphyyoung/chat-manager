<script setup lang="ts">
import type { Question } from '../../types'

interface Props {
  question: Question
  isActive: boolean
}

defineProps<Props>()
</script>

<template>
  <div
    class="question-item"
    :class="{ 'question-item--active': isActive }"
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
