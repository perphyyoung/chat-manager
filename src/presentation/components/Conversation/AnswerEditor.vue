<script setup lang="ts">
import { watch, nextTick } from "vue";
import { useCodeMirror } from "./useCodeMirror";

interface Props {
  content: string;
  modelValue: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "save", content: string): void;
  (e: "contextmenu", event: MouseEvent): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const {
  editorContainer,
  showLineNumbers,
  wordWrap,
  initCodeMirror,
  destroyCodeMirror,
  toggleLineNumbers,
  toggleWordWrap,
  getContent,
  undo,
  redo,
} = useCodeMirror({
  initialContent: props.content,
  onContentChange: () => {
    // 可以在这里添加内容变化处理
  },
});

// 监听编辑器打开状态和 content 变化
watch(
  () => [props.modelValue, props.content],
  ([newModelValue, newContent]) => {
    if (newModelValue) {
      nextTick(() => {
        // 每次打开编辑器时重新初始化，使用最新的 content
        destroyCodeMirror();
        initCodeMirror(newContent as string);
      });
    } else {
      destroyCodeMirror();
    }
  },
);

const handleSave = () => {
  const content = getContent();
  if (content.trim()) {
    emit("save", content.trim());
  }
  emit("update:modelValue", false);
};

const handleCancel = () => {
  emit("update:modelValue", false);
};

const handleContextMenu = (event: MouseEvent) => {
  emit("contextmenu", event);
};

// 暴露方法给父组件
defineExpose({
  toggleLineNumbers,
  toggleWordWrap,
  undo,
  redo,
  showLineNumbers,
  wordWrap,
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fullscreen-edit-overlay"
      @click="handleCancel"
    >
      <div
        class="fullscreen-edit-container"
        @click.stop
        @contextmenu="handleContextMenu"
      >
        <div class="fullscreen-edit-header">
          <span class="edit-title">编辑回答</span>
          <div class="fullscreen-edit-actions">
            <button class="btn-action" @click="undo" title="撤销 (Ctrl+Z)">
              ↩
            </button>
            <button class="btn-action" @click="redo" title="重做 (Ctrl+Y)">
              ↪
            </button>
            <button class="btn-cancel" @click="handleCancel">取消</button>
            <button class="btn-save" @click="handleSave">保存</button>
          </div>
        </div>
        <div ref="editorContainer" class="fullscreen-edit-editor" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 全屏编辑模式 */
.fullscreen-edit-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: var(--color-background);
  display: flex;
  flex-direction: column;
  z-index: 10000;
}

.fullscreen-edit-container {
  width: 100%;
  height: 100%;
  background-color: var(--color-background);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fullscreen-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.edit-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.fullscreen-edit-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-action {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  background-color: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.btn-save,
.btn-cancel {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-save {
  background-color: var(--color-primary);
  color: white;
}

.btn-save:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.btn-cancel {
  background-color: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover {
  background-color: var(--color-border);
  color: var(--color-text);
}

.fullscreen-edit-editor {
  flex: 1;
  width: 100%;
  overflow: hidden;
  position: relative;
}

/* CodeMirror 样式调整 */
.fullscreen-edit-editor :deep(.cm-editor) {
  height: 100%;
  font-size: 15px;
  font-family: "Monaco", "Menlo", "Consolas", "Courier New", monospace;
}

.fullscreen-edit-editor :deep(.cm-scroller) {
  overflow: auto;
}

/* 行号样式 */
.fullscreen-edit-editor :deep(.cm-lineNumbers) {
  min-width: 40px;
  padding-right: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
  user-select: none;
}

.fullscreen-edit-editor :deep(.cm-lineNumbers .cm-lineNumber) {
  padding-left: 4px;
}

.fullscreen-edit-editor :deep(.cm-activeLineGutter) {
  background-color: transparent;
}

/* 搜索面板样式 - 极简工业风悬浮胶囊 */
.fullscreen-edit-editor :deep(.cm-panels) {
  position: absolute;
  top: 16px;
  right: 16px;
  left: auto;
  z-index: 100;
  width: auto;
}

.fullscreen-edit-editor :deep(.cm-panels.cm-panels-top) {
  background: transparent;
  border: none;
}

/* 搜索面板 - 胶囊容器 */
.fullscreen-edit-editor :deep(.cm-search) {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* 搜索框样式 - 无边框内嵌 */
.fullscreen-edit-editor :deep(.cm-search input) {
  background-color: transparent;
  border: none;
  border-radius: 16px;
  padding: 6px 10px;
  color: var(--color-text);
  font-size: 14px;
  width: 100px;
  outline: none;
  transition: width 0.2s ease;
}

.fullscreen-edit-editor :deep(.cm-search input):focus {
  width: 130px;
}

/* 按钮基础样式 - 圆形图标按钮 */
.fullscreen-edit-editor :deep(.cm-search button) {
  background-color: transparent;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  font-size: 0; /* 隐藏原文字 */
}

.fullscreen-edit-editor :deep(.cm-search button:hover) {
  background-color: var(--color-hover);
  color: var(--color-text);
}

/* next 按钮 - ▼ 下箭头 (根据官方源码，按钮使用 name="next") */
.fullscreen-edit-editor :deep(.cm-search button[name="next"]) {
  font-size: 0;
}

.fullscreen-edit-editor :deep(.cm-search button[name="next"])::before {
  content: "▼";
  font-size: 10px;
}

/* previous 按钮 - ▲ 上箭头 (根据官方源码，按钮使用 name="prev") */
.fullscreen-edit-editor :deep(.cm-search button[name="prev"]) {
  font-size: 0;
}

.fullscreen-edit-editor :deep(.cm-search button[name="prev"])::before {
  content: "▲";
  font-size: 10px;
}

/* 隐藏替换输入框 */
.fullscreen-edit-editor :deep(.cm-search input[placeholder="Replace"]) {
  display: none !important;
}

/* 隐藏 Replace 按钮 */
.fullscreen-edit-editor :deep(.cm-search button[name="replace"]) {
  display: none !important;
}

/* 隐藏 Replace All 按钮 */
.fullscreen-edit-editor :deep(.cm-search button[name="replaceAll"]) {
  display: none !important;
}

/* 隐藏 select 按钮 (显示所有匹配) */
.fullscreen-edit-editor :deep(.cm-search button[name="select"]) {
  display: none !important;
}

/* 隐藏所有选项标签和复选框 */
.fullscreen-edit-editor :deep(.cm-search label) {
  display: none !important;
}

/* 隐藏 br 换行 */
.fullscreen-edit-editor :deep(.cm-search br) {
  display: none !important;
}

/* 搜索索引显示 - 胶囊标签 */
.fullscreen-edit-editor :deep(.cm-search)::after {
  content: attr(data-search-index);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-left: 4px;
  margin-right: 28px;
  min-width: 40px;
}
</style>
