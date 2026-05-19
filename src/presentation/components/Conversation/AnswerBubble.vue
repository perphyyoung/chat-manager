<script setup lang="ts">
interface Props {
  content: string
}

defineProps<Props>()
</script>

<template>
  <div class="answer-bubble">
    <div class="answer-bubble__content">{{ content }}</div>
  </div>
</template>

<style scoped>
/* 回答气泡：左对齐，使用 CSS 变量自动适配浅色/深色主题
 * - 浅色主题：浅灰背景（#ffffff），深灰文字（#111827）
 * - 深色主题：深灰背景（#1a1a1a），浅灰文字（#e5e5e5）
 */
.answer-bubble {
  display: flex;
  justify-content: flex-start;
  margin-right: auto;
  max-width: 85%;
}

.answer-bubble__content {
  padding: 12px 16px;
  background-color: var(--color-surface);  /* 卡片背景，随主题变化 */
  color: var(--color-text);                 /* 正文色，随主题变化 */
  border: 1px solid var(--color-border);    /* 边框色，随主题变化 */
  border-radius: 12px 12px 4px 12px;        /* 右上、右下、左下圆角，左上小圆角 */
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
}
</style>
