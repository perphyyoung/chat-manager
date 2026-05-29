<script setup lang="ts">
import { computed } from "vue";
import { useDocumentStore } from "../../stores/document";
import { parseMarkdown, highlightSearchText } from "../../utils/markdown";

interface Props {
  content: string;
}

const props = defineProps<Props>();
const documentStore = useDocumentStore();

const renderedContent = computed(() => {
  const html = parseMarkdown(props.content);
  if (documentStore.highlightText) {
    return highlightSearchText(html, documentStore.highlightText);
  }
  return html;
});
</script>

<template>
  <div class="markdown-renderer" v-html="renderedContent" />
</template>

<style scoped>
/* Markdown 渲染样式 */
.markdown-renderer :deep(p) {
  margin: 0 0 8px;
}

.markdown-renderer :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-renderer :deep(strong) {
  font-weight: 600;
}

.markdown-renderer :deep(em) {
  font-style: italic;
}

/* 行内代码 */
.markdown-renderer :deep(:not(pre) > code) {
  background-color: var(--color-border);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "Monaco", "Menlo", "Consolas", monospace;
  font-size: 12px;
  color: var(--color-text);
}

/* 代码块 */
.markdown-renderer :deep(pre) {
  padding: 0;
  margin: 8px 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #2d2d2d;
}

.markdown-renderer :deep(pre code) {
  display: block;
  padding: 16px;
  overflow-x: auto;
  font-family: "Monaco", "Menlo", "Consolas", monospace;
  font-size: 13px;
  line-height: 1.5;
  background-color: transparent;
}

.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-renderer :deep(li) {
  margin: 4px 0;
}

.markdown-renderer :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
  pointer-events: none;
}

.markdown-renderer :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  margin: 8px 0;
  padding-left: 12px;
  color: var(--color-text-secondary);
}

.markdown-renderer :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 12px 0;
}

/* 搜索高亮样式 */
.markdown-renderer :deep(.search-highlight) {
  background-color: var(--color-highlight-bg, #ffeb3b);
  color: #000;
  padding: 1px 2px;
  border-radius: 2px;
  animation: highlight-pulse 0.3s ease-out;
}

@keyframes highlight-pulse {
  0% {
    background-color: var(--color-highlight-bg, #ffeb3b);
  }
  50% {
    background-color: var(--color-highlight-bg, #ffeb3b);
    box-shadow: 0 0 8px var(--color-highlight-bg, #ffeb3b);
  }
  100% {
    background-color: var(--color-highlight-bg, #ffeb3b);
  }
}
</style>
