<script setup lang="ts">
interface Props {
  text: string
}

defineProps<Props>()
</script>

<template>
  <div class="question-bubble">
    <div class="question-bubble__content">{{ text }}</div>
  </div>
</template>

<style scoped>
/* 问题气泡：右对齐，主题色背景，白色文字
 * 在浅色和深色主题下保持不变
 */
.question-bubble {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
  max-width: 70%;
}

.question-bubble__content {
  padding: 12px 16px;
  background-color: var(--color-primary);  /* 主题色（蓝色/紫色等） */
  color: white;                             /* 固定白色文字 */
  border-radius: 12px 12px 12px 4px;        /* 左上、左下、右下圆角，右上小圆角 */
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}
</style>
