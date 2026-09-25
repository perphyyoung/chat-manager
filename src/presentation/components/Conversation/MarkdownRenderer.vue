<script setup lang="ts">
import { computed } from "vue";
import { useDocumentStore } from "../../stores/document";
import { parseMarkdown, highlightSearchText } from "../../utils/markdown";
import TagBadge from "../common/TagBadge.vue";

interface Props {
  content: string;
}

const props = defineProps<Props>();
const documentStore = useDocumentStore();

const parsed = computed(() => parseMarkdown(props.content));

const renderedHtml = computed(() => {
  const { html } = parsed.value;
  if (documentStore.highlightText) {
    return highlightSearchText(html, documentStore.highlightText, documentStore.highlightRegexMode);
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

// 复制代码按钮为 v-html 注入，无法绑定事件，用根容器事件委托处理
const onContentClick = async (e: MouseEvent) => {
  const btn = (e.target as HTMLElement).closest(".code-copy-btn");
  if (!btn) return;
  const code = btn.closest("pre")?.querySelector("code");
  if (!code) return;
  try {
    // textContent 不含伪元素生成的行号，复制的是纯代码
    await navigator.clipboard.writeText(code.textContent ?? "");
    btn.textContent = "已复制";
    setTimeout(() => (btn.textContent = "复制"), 1500);
  } catch (err) {
    // 剪贴板写入失败不静默：统一写入 cm.log
    window.electronAPI.renderLog("error", `复制代码失败: ${String(err)}`);
  }
};
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
        <span v-if="item.isArray" class="markdown-renderer__frontmatter-tags">
          <TagBadge v-for="tag in item.items" :key="tag" :name="tag" />
        </span>
        <span v-else class="markdown-renderer__frontmatter-value">{{ item.items[0] }}</span>
      </div>
    </div>
    <div v-html="renderedHtml" @click="onContentClick" />
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
  font-family: var(--font-mono);
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
  /* 语言徽标/复制按钮 absolute 定位的锚点 */
  position: relative;
  /* 行号列与代码列横向并排 */
  display: flex;
  align-items: stretch;
}

/* 行号列与代码列共用：字号、字体、行高必须一致（行高即行距，调行距只改这里，两列同步不错位） */
.markdown-renderer :deep(pre code),
.markdown-renderer :deep(.code-lines) {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.4;
}

.markdown-renderer :deep(pre code) {
  /* 行号列固定不动，代码列占剩余宽度并横向滚动 */
  flex: 1 1 auto;
  min-width: 0;
  /* 顶部留出徽标与复制按钮的空间，行号由独立行号列承担，无需左 padding */
  padding: 32px 16px 16px 0;
  overflow-x: auto;
  background-color: transparent;
}

/* 行号列：与代码列分离，代码横向滚动时行号列固定在左侧；行高与代码行一致保证逐行对齐 */
.markdown-renderer :deep(.code-lines) {
  flex: 0 0 auto;
  padding: 32px 12px 16px 0;
  text-align: right;
  white-space: pre;
  color: rgba(255, 255, 255, 0.4);
  user-select: none;
}

/* 语言徽标：渲染层读取代码块声明的 lang 显示在左上角（markdown.ts 生成） */
.markdown-renderer :deep(.code-block-lang) {
  position: absolute;
  top: 6px;
  left: 16px;
  font-size: 11px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.55);
  user-select: none;
  pointer-events: none;
}

/* 复制代码按钮：右上角，位于滚动容器之外，不随代码滚动 */
.markdown-renderer :deep(.code-copy-btn) {
  position: absolute;
  top: 6px;
  right: 8px;
  padding: 2px 8px;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  background-color: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}

.markdown-renderer :deep(.code-copy-btn:hover) {
  background-color: rgba(255, 255, 255, 0.16);
  color: #fff;
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

/* 表格样式
 * display:block + overflow-x:auto：宽表格（多列长单元格）的 min-content 会向外传播撑破气泡，
 * 块级化后超宽部分在表内横向滚动，不再入侵右侧面板 */
.markdown-renderer :deep(table) {
  display: block;
  overflow-x: auto;
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
