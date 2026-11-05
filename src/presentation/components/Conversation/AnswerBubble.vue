<script setup lang="ts">
import { ref, computed, inject, watch, nextTick, onBeforeUnmount } from "vue";
import MarkdownRenderer from "./MarkdownRenderer.vue";
import AnswerEditor from "./AnswerEditor.vue";
import ContextMenu, { type MenuItem } from "../common/ContextMenu.vue";
import { useDocumentStore } from "../../stores/document";
import { useSettingsStore } from "../../stores/settings";

const showToast = inject("showToast") as (message: string) => void;

interface Props {
  content: string;
  answerId: string;
}

interface Emits {
  (e: "update", id: string, content: string): void;
  (e: "beforeUpdate"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const documentStore = useDocumentStore();
const settingsStore = useSettingsStore();

// 正文按 14px 字号、1.6 行高排版，按设置行数直接换算截断高度
const LINE_HEIGHT_PX = 14 * 1.6;

const contentRef = ref<HTMLElement | null>(null);
const hasOverflow = ref(false);

const maxLines = computed(() => settingsStore.answerMaxLines);
const isExpanded = computed(() => documentStore.isAnswerExpanded(props.answerId));
const maxHeightPx = computed(() => maxLines.value * LINE_HEIGHT_PX);
const isClamped = computed(() => maxLines.value > 0 && !isExpanded.value);

const clampStyle = computed(() => {
  if (!isClamped.value) {
    return undefined;
  }
  return { maxHeight: `${maxHeightPx.value}px` };
});

// 只有内容高度超过截断高度才显示展开按钮；行数为 0 表示不限制
function measureOverflow() {
  const el = contentRef.value;
  if (!el || maxLines.value === 0) {
    hasOverflow.value = false;
    return;
  }
  hasOverflow.value = el.scrollHeight - maxHeightPx.value > 1;
}

let resizeObserver: ResizeObserver | null = null;

// 编辑器切换会重建内容节点：重建后重新观察并测量
watch(contentRef, (el) => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (el) {
    resizeObserver = new ResizeObserver(() => measureOverflow());
    resizeObserver.observe(el);
  }
  nextTick(measureOverflow);
});

watch([() => props.content, maxLines, isClamped], () => {
  nextTick(measureOverflow);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

function handleToggle() {
  documentStore.toggleAnswerExpanded(props.answerId);
}

// 只保留必要的状态
const isEditing = ref(false);
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  isEditing: false,
});

const editorRef = ref<InstanceType<typeof AnswerEditor>>();

// 右键菜单项配置
const contextMenuItems = computed<MenuItem[]>(() => [
  {
    text: "复制",
    action: copyContent,
    visible: !contextMenu.value.isEditing,
  },
  {
    text: "编辑",
    action: startEdit,
    visible: !contextMenu.value.isEditing,
  },
  {
    text: "显示行号",
    action: () => editorRef.value?.toggleLineNumbers(),
    visible: contextMenu.value.isEditing,
  },
  {
    text: "长文本换行",
    action: () => editorRef.value?.toggleWordWrap(),
    visible: contextMenu.value.isEditing,
  },
  {
    text: "格式化",
    action: formatContent,
    visible: contextMenu.value.isEditing,
  },
]);

async function formatContent() {
  const content = editorRef.value?.getContent() ?? "";
  if (!content.trim()) {
    closeContextMenu();
    return;
  }
  try {
    const formatted = await window.electronAPI.formatMarkdown(content);
    if (formatted !== content) {
      editorRef.value?.setContent(formatted);
      showToast("已按 markdownlint 规则格式化");
    } else {
      showToast("内容已符合规则，无需格式化");
    }
  } catch (err) {
    // 格式化失败（如 cli2 执行异常）：明确提示，不静默
    showToast(`格式化失败：${String(err)}`);
  }
  closeContextMenu();
}

async function copyContent() {
  await navigator.clipboard.writeText(props.content);
  showToast("回答已复制");
  closeContextMenu();
}

function startEdit() {
  // 通过右键菜单编辑
  isEditing.value = true;
  closeContextMenu();
}

function handleSave(content: string) {
  emit("beforeUpdate");
  emit("update", props.answerId, content);
  isEditing.value = false;
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault();
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    isEditing: isEditing.value,
  };
}

function closeContextMenu() {
  contextMenu.value.show = false;
}
</script>

<template>
  <div class="answer-bubble">
    <!-- 渲染模式：正文默认按设置行数截断，超出时在气泡四角提供展开/收起 -->
    <div v-if="!isEditing" class="answer-bubble__content" @contextmenu="handleContextMenu">
      <button
        v-if="hasOverflow && isExpanded"
        class="answer-bubble__toggle answer-bubble__toggle--top"
        type="button"
        aria-label="收起回答（右上角）"
        aria-expanded="true"
        @click="handleToggle"
      >
        收起
      </button>
      <div
        ref="contentRef"
        class="answer-bubble__body"
        :class="{ 'answer-bubble__body--clamped': isClamped }"
        :style="clampStyle"
      >
        <MarkdownRenderer :content="content" />
      </div>
      <button
        v-if="hasOverflow"
        class="answer-bubble__toggle answer-bubble__toggle--bottom"
        type="button"
        :aria-label="isExpanded ? '收起回答（右下角）' : '展开全文'"
        :aria-expanded="isExpanded"
        @click="handleToggle"
      >
        {{ isExpanded ? "收起" : "展开全文" }}
      </button>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @close="closeContextMenu"
    />

    <!-- 全屏编辑模式 -->
    <AnswerEditor
      ref="editorRef"
      v-model="isEditing"
      :content="content"
      @save="handleSave"
      @contextmenu="handleContextMenu"
    />
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
  max-width: 100%;
}

/* min-width:0 允许 flex 子项收缩，防止宽表格的 min-content 撑破气泡上限 */
.answer-bubble__content {
  box-sizing: border-box;
  position: relative;
  min-width: 0;
  max-width: 100%;
  padding: 12px 16px;
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 12px 12px 4px 12px;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
}

/* 正文容器：高度按设置行数截断，超出部分隐藏 */
.answer-bubble__body {
  min-width: 0;
}

.answer-bubble__body--clamped {
  overflow: hidden;
}

/* 展开/收起入口：压在上下边框线上，不占布局行，展开/收起不引起正文跳变 */
.answer-bubble__toggle {
  position: absolute;
  right: 14px;
  z-index: 1;
  padding: 0 6px;
  background-color: var(--color-surface);
  border: none;
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
}

.answer-bubble__toggle--top {
  top: 0;
  transform: translateY(-50%);
}

.answer-bubble__toggle--bottom {
  bottom: 0;
  transform: translateY(50%);
}

.answer-bubble__toggle:hover {
  color: var(--color-primary);
}
</style>
