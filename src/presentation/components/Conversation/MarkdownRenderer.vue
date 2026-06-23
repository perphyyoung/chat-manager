<script setup lang="ts">
import { computed } from "vue";
import { useDocumentStore } from "../../stores/document";
import { parseMarkdown, highlightSearchText } from "../../utils/markdown";

interface Props {
  content: string;
}

const props = defineProps<Props>();
const documentStore = useDocumentStore();

const parsed = computed(() => parseMarkdown(props.content));

const renderedHtml = computed(() => {
  const { html } = parsed.value;
  if (documentStore.highlightText) {
    return highlightSearchText(html, documentStore.highlightText);
  }
  return html;
});

const frontmatterList = computed(() => {
  const fm = parsed.value.frontmatter;
  if (!fm) return [];
  return Object.entries(fm).map(([key, value]) => {
    if (Array.isArray(value)) {
      return { key, isArray: true as const, items: value.map(String) };
    }
    if (typeof value === "object" && value !== null) {
      return { key, isArray: false as const, items: [JSON.stringify(value)] };
    }
    return { key, isArray: false as const, items: [String(value)] };
  });
});
</script>

<template>
  <div class="markdown-renderer">
    <div v-if="frontmatterList.length > 0" class="markdown-renderer__frontmatter">
      <div
        v-for="item in frontmatterList"
        :key="item.key"
        class="markdown-renderer__frontmatter-item"
      >
        <span class="markdown-renderer__frontmatter-key">{{ item.key }}</span>
        <span
          v-if="item.isArray"
          class="markdown-renderer__frontmatter-tags"
        >
          <span
            v-for="tag in item.items"
            :key="tag"
            class="markdown-renderer__frontmatter-tag"
          >{{ tag }}</span>
        </span>
        <span
          v-else
          class="markdown-renderer__frontmatter-value"
        >{{ item.items[0] }}</span>
      </div>
    </div>
    <div v-html="renderedHtml" />
  </div>
</template>

<style scoped>
/* Frontmatter 元信息 */
.markdown-renderer__frontmatter {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: var(--color-background);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.markdown-renderer__frontmatter-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.4;
}

.markdown-renderer__frontmatter-key {
  color: var(--color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
  min-width: 120px;
}

.markdown-renderer__frontmatter-value {
  color: var(--color-text);
  word-break: break-word;
}

.markdown-renderer__frontmatter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.markdown-renderer__frontmatter-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-text);
}

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

/* 表格样式 */
.markdown-renderer :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.markdown-renderer :deep(th),
.markdown-renderer :deep(td) {
  border: 1px solid var(--color-border);
  padding: 8px 12px;
}

.markdown-renderer :deep(th) {
  background-color: var(--color-border);
  font-weight: 600;
}

.markdown-renderer :deep(tr:nth-child(even)) {
  background-color: var(--color-background-alt, rgba(0, 0, 0, 0.02));
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
