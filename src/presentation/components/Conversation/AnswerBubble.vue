<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import Prism from 'prismjs'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap } from '@codemirror/commands'
import { languages } from '@codemirror/language-data'
import { search, searchKeymap, highlightSelectionMatches, getSearchQuery } from '@codemirror/search'

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
  (e: 'beforeUpdate'): void
}>()

const isEditing = ref(false)
const editContent = ref('')
const editorContainer = ref<HTMLElement | null>(null)
const editorView = ref<EditorView | null>(null)

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
})

// 搜索状态
const searchIndex = ref(0)
const searchCount = ref(0)

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
  const result = marked.parse(props.content) as string
  return result
})

function startEdit() {
  editContent.value = props.content
  isEditing.value = true
}

// 监听编辑模式变化，初始化 CodeMirror
watch(isEditing, (newVal) => {
  if (newVal) {
    nextTick(() => {
      initCodeMirror()
    })
  } else {
    destroyCodeMirror()
  }
})

// 更新搜索索引显示
// 使用 CodeMirror 的 search query 来获取准确的匹配位置
function updateSearchDisplay(view: EditorView) {
  const searchPanel = view.dom.querySelector('.cm-search')
  if (!searchPanel) return

  const query = getSearchQuery(view.state)

  if (query.search) {
    const cursor = query.getCursor(view.state)
    const matches: { from: number; to: number }[] = []

    // 收集所有匹配位置
    let result = cursor.next()
    while (!result.done) {
      matches.push({ from: result.value.from, to: result.value.to })
      result = cursor.next()
    }

    searchCount.value = matches.length

    if (searchCount.value > 0) {
      // 获取当前选中的位置
      const selection = view.state.selection.main
      const cursorFrom = selection.from
      const cursorTo = selection.to

      // 查找当前选区对应的匹配索引
      // 使用 from 位置来匹配，因为选区应该正好覆盖匹配文本
      const currentIndex = matches.findIndex(
        (match) => match.from === cursorFrom && match.to === cursorTo,
      )

      // 如果没精确匹配，尝试只匹配 from 位置（考虑边界情况）
      if (currentIndex === -1) {
        const approximateIndex = matches.findIndex(
          (match) => cursorFrom >= match.from && cursorFrom <= match.to,
        )
        searchIndex.value = approximateIndex !== -1 ? approximateIndex + 1 : 1
      } else {
        searchIndex.value = currentIndex + 1
      }
    } else {
      searchIndex.value = 0
    }

    searchPanel.setAttribute('data-search-index', `${searchIndex.value}/${searchCount.value}`)
  } else {
    searchIndex.value = 0
    searchCount.value = 0
    searchPanel.removeAttribute('data-search-index')
  }
}

// 初始化 CodeMirror（使用官方搜索）
function initCodeMirror() {
  if (!editorContainer.value) return

  editorView.value = new EditorView({
    state: EditorState.create({
      doc: editContent.value,
      extensions: [
        markdown({ codeLanguages: languages }),
        oneDark,
        search({ top: true }), // 官方搜索面板，显示在顶部
        keymap.of([...defaultKeymap, ...searchKeymap]),
        highlightSelectionMatches(), // 高亮选中的匹配
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            editContent.value = update.state.doc.toString()
          }
          // 更新搜索索引显示
          updateSearchDisplay(update.view)
        }),
        // 确保编辑器可聚焦
        EditorView.contentAttributes.of({ tabindex: '0' }),
      ],
    }),
    parent: editorContainer.value,
  })

  // 确保编辑器获得焦点
  editorView.value.focus()
}

// 销毁 CodeMirror
function destroyCodeMirror() {
  if (editorView.value) {
    editorView.value.destroy()
    editorView.value = null
  }
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
    const lines = code.split('\n')
    // 找到第一个非空行
    const firstNonEmptyLine = lines.find((line) => line.trim())
    if (!firstNonEmptyLine || !firstNonEmptyLine.startsWith('// language:')) {
      const newCode = `// language: ${lang}\n${code}`
      formatted = formatted.replace(match[0], `\`\`\`${lang}\n${newCode}\`\`\``)
    }
  }

  if (formatted !== props.content) {
    emit('beforeUpdate')
    emit('update', props.answerId, formatted)
  }
  closeContextMenu()
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
      v-html="renderedContent"
    />

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

    <!-- 全屏编辑模式 -->
    <Teleport to="body">
      <div v-if="isEditing" class="fullscreen-edit-overlay" @click="cancelEdit">
        <div class="fullscreen-edit-container" @click.stop>
          <div class="fullscreen-edit-header">
            <span class="edit-title">编辑回答</span>
            <div class="fullscreen-edit-actions">
              <button class="btn-cancel" @click="cancelEdit">取消</button>
              <button class="btn-save" @click="saveEdit">保存</button>
            </div>
          </div>
          <div ref="editorContainer" class="fullscreen-edit-editor" />
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
  pointer-events: none;
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
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
}

.fullscreen-edit-editor :deep(.cm-scroller) {
  overflow: auto;
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
.fullscreen-edit-editor :deep(.cm-search button[name='next']) {
  font-size: 0;
}

.fullscreen-edit-editor :deep(.cm-search button[name='next'])::before {
  content: '▼';
  font-size: 10px;
}

/* previous 按钮 - ▲ 上箭头 (根据官方源码，按钮使用 name="prev") */
.fullscreen-edit-editor :deep(.cm-search button[name='prev']) {
  font-size: 0;
}

.fullscreen-edit-editor :deep(.cm-search button[name='prev'])::before {
  content: '▲';
  font-size: 10px;
}

/* 隐藏替换输入框 */
.fullscreen-edit-editor :deep(.cm-search input[placeholder='Replace']) {
  display: none !important;
}

/* 隐藏 Replace 按钮 */
.fullscreen-edit-editor :deep(.cm-search button[name='replace']) {
  display: none !important;
}

/* 隐藏 Replace All 按钮 */
.fullscreen-edit-editor :deep(.cm-search button[name='replaceAll']) {
  display: none !important;
}

/* 隐藏 select 按钮 (显示所有匹配) */
.fullscreen-edit-editor :deep(.cm-search button[name='select']) {
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

.fullscreen-edit-actions {
  display: flex;
  gap: 12px;
  align-items: center;
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
</style>
