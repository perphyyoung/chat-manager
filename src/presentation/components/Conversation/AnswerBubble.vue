<script setup lang="ts">
import { ref, computed } from "vue";
import MarkdownRenderer from "./MarkdownRenderer.vue";
import AnswerEditor from "./AnswerEditor.vue";
import ContextMenu, { type MenuItem } from "./ContextMenu.vue";

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
    icon: "✨",
    text: "格式化",
    action: formatCode,
    visible: !contextMenu.value.isEditing,
  },
  {
    icon: editorRef.value?.showLineNumbers ? "☑" : "☐",
    text: "显示行号",
    action: () => editorRef.value?.toggleLineNumbers(),
    visible: contextMenu.value.isEditing,
  },
  {
    icon: editorRef.value?.wordWrap ? "☑" : "☐",
    text: "长文本换行",
    action: () => editorRef.value?.toggleWordWrap(),
    visible: contextMenu.value.isEditing,
  },
]);

// 简化的方法
function startEdit() {
  isEditing.value = true;
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

function formatCode() {
  // 格式化：为代码块添加语言标记注释
  const codeBlockRegex = /```([^\s`]+)?\n([\s\S]*?)```/g;
  let formatted = props.content;
  let match;

  while ((match = codeBlockRegex.exec(props.content)) !== null) {
    const lang = match[1] || "plaintext";
    const code = match[2] ?? "";
    if (!code) continue;

    // 检查是否已格式化（第一行是否包含 // language:）
    const lines = code.split("\n");
    // 找到第一个非空行
    const firstNonEmptyLine = lines.find((line) => line.trim());
    if (!firstNonEmptyLine || !firstNonEmptyLine.startsWith("// language:")) {
      const newCode = `// language: ${lang}\n${code}`;
      formatted = formatted.replace(
        match[0],
        `\`\`\`${lang}\n${newCode}\`\`\``,
      );
    }
  }

  if (formatted !== props.content) {
    emit("beforeUpdate");
    emit("update", props.answerId, formatted);
  }
  closeContextMenu();
}
</script>

<template>
  <div class="answer-bubble">
    <!-- 渲染模式 -->
    <div
      v-if="!isEditing"
      class="answer-bubble__content"
      @dblclick="startEdit"
      @contextmenu="handleContextMenu"
    >
      <MarkdownRenderer :content="content" />
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
  max-width: 85%;
}

.answer-bubble__content {
  padding: 12px 16px;
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 12px 12px 4px 12px;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
  cursor: pointer;
}
</style>
