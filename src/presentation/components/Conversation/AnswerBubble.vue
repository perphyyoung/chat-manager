<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import Prism from 'prismjs'

// 加载常用语言支持
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-docker'
import 'prismjs/components/prism-nginx'

// 注册 Vue 语言支持（基于 HTML）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(Prism.languages as Record<string, any>).vue = Prism.languages.extend('html', {})

interface Props {
  content: string
  answerId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', id: string, content: string): void
}>()

const isEditing = ref(false)
const editContent = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
})

// 创建带语法高亮的 marked 实例
const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'language-plaintext',
    langPrefix: 'language-',
    highlight(code, lang) {
      const language = Prism.languages[lang] ? lang : 'plaintext'
      return Prism.highlight(code, Prism.languages[language]!, language)
    },
  }),
)

marked.setOptions({
  breaks: true, // 支持换行符转换为 <br>
  gfm: true, // 支持 GitHub Flavored Markdown
})

const renderedContent = computed(() => {
  return marked.parse(props.content)
})

function startEdit() {
  editContent.value = props.content
  isEditing.value = true
  // 自动调整高度并聚焦
  nextTick(() => {
    if (textareaRef.value) {
      adjustTextareaHeight()
      textareaRef.value.focus()
    }
  })
}

function adjustTextareaHeight() {
  const textarea = textareaRef.value
  if (!textarea) return
  // 重置高度以获取正确的 scrollHeight
  textarea.style.height = 'auto'
  // 设置新高度（最小120px，最大400px）
  const newHeight = Math.max(120, Math.min(textarea.scrollHeight, 400))
  textarea.style.height = `${newHeight}px`
}

function saveEdit() {
  if (editContent.value.trim()) {
    emit('update', props.answerId, editContent.value.trim())
  }
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
  editContent.value = ''
}

function handleInput() {
  adjustTextareaHeight()
}

function handleKeydown(e: KeyboardEvent) {
  // Ctrl+Enter 保存
  if (e.ctrlKey && e.key === 'Enter') {
    saveEdit()
  }
  // ESC 取消
  if (e.key === 'Escape') {
    cancelEdit()
  }
}

// 右键菜单
function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
  }
}

function closeContextMenu() {
  contextMenu.value.show = false
}

// 格式化：为代码块添加语言标记注释
function formatCode() {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let formatted = props.content
  let match

  while ((match = codeBlockRegex.exec(props.content)) !== null) {
    const lang = match[1] || 'plaintext'
    const code = match[2] ?? ''
    if (!code) continue

    // 检查是否已格式化（第一行是否包含 // language:）
    const firstLine = code.split('\n')[0]?.trim()
    if (firstLine && !firstLine.startsWith('// language:')) {
      const newCode = `// language: ${lang}\n${code}`
      formatted = formatted.replace(match[0], `\`\`\`${lang}\n${newCode}\`\`\``)
    }
  }

  if (formatted !== props.content) {
    emit('update', props.answerId, formatted)
  }
  closeContextMenu()
}
</script>

<template>
  <div class="answer-bubble" :class="{ 'is-editing': isEditing }">
    <!-- 渲染模式 -->
    <div
      v-if="!isEditing"
      class="answer-bubble__content"
      @dblclick="startEdit"
      @contextmenu="handleContextMenu"
      v-html="renderedContent"
    />
    <!-- 编辑模式 -->
    <div v-else class="answer-bubble__edit">
      <div class="edit-header">
        <span class="edit-hint">编辑模式</span>
        <span class="edit-shortcut">Ctrl+Enter 保存 · ESC 取消</span>
      </div>
      <textarea
        ref="textareaRef"
        v-model="editContent"
        class="edit-textarea"
        placeholder="输入回答内容..."
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <div class="edit-actions">
        <button class="btn-cancel" @click="cancelEdit">取消</button>
        <button class="btn-save" @click="saveEdit">保存</button>
      </div>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenu.show"
        class="context-menu-overlay"
        @click="closeContextMenu"
        @contextmenu.prevent
      >
        <div
          class="context-menu"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
          @click.stop
        >
          <div class="context-menu-item" @click="formatCode">
            <span class="context-menu-icon">✨</span>
            <span class="context-menu-text">格式化</span>
          </div>
        </div>
      </div>
    </Teleport>
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

/* Markdown 样式 */
.answer-bubble__content :deep(p) {
  margin: 0 0 8px;
}

.answer-bubble__content :deep(p:last-child) {
  margin-bottom: 0;
}

.answer-bubble__content :deep(strong) {
  font-weight: 600;
}

.answer-bubble__content :deep(em) {
  font-style: italic;
}

/* 行内代码 */
.answer-bubble__content :deep(:not(pre) > code) {
  background-color: var(--color-border);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  color: var(--color-text);
}

/* 代码块 */
.answer-bubble__content :deep(pre) {
  padding: 0;
  margin: 8px 0;
  border-radius: 8px;
  overflow: hidden;
  background-color: #2d2d2d;
}

.answer-bubble__content :deep(pre code) {
  display: block;
  padding: 16px;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  background-color: transparent;
}

.answer-bubble__content :deep(ul),
.answer-bubble__content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.answer-bubble__content :deep(li) {
  margin: 4px 0;
}

.answer-bubble__content :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
}

.answer-bubble__content :deep(a:hover) {
  text-decoration: underline;
}

.answer-bubble__content :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  margin: 8px 0;
  padding-left: 12px;
  color: var(--color-text-secondary);
}

.answer-bubble__content :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 12px 0;
}

/* 编辑模式样式 - 全宽布局 */
.answer-bubble.is-editing {
  max-width: 100%;
  width: 100%;
}

.answer-bubble__edit {
  width: 100%;
  background-color: var(--color-surface);
  border: 2px solid var(--color-primary);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.edit-hint {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
}

.edit-shortcut {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.edit-textarea {
  width: 100%;
  min-height: 120px;
  max-height: 400px;
  padding: 12px 16px;
  background-color: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.edit-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-alpha);
}

.edit-textarea::placeholder {
  color: var(--color-text-secondary);
}

.edit-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  justify-content: flex-end;
}

.btn-save,
.btn-cancel {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
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

/* 右键菜单 */
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}

.context-menu {
  position: fixed;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 120px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.context-menu-item:hover {
  background-color: var(--color-hover);
}

.context-menu-icon {
  font-size: 14px;
}

.context-menu-text {
  font-size: 13px;
  color: var(--color-text);
}
</style>
