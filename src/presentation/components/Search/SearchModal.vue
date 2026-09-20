<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import SearchInput from "./SearchInput.vue";
import SearchResultsComponent from "./SearchResults.vue";
import type { SearchResults } from "@/types/search";

interface SearchResult {
  id: string;
  type: "document" | "question" | "answer" | "tag";
  title?: string;
  content: string;
  metadata?: string;
  documentId?: string;
  questionId?: string;
}

const STORAGE_KEY = "search-history";
const MAX_HISTORY = 10;

function loadHistory(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

const isOpen = ref(false);
const query = ref("");
// 正则模式：开启后查询按正则表达式匹配所有字段原文
const isRegex = ref(false);
// 搜索说明 popover 是否显示
const showHelp = ref(false);
// 正则表达式非法或查询失败时的提示
const searchError = ref("");
const results = ref<SearchResults>({
  documents: [],
  questions: [],
  answers: [],
  tags: [],
});
const selectedIndex = ref(-1);
const isLoading = ref(false);
const inputRef = ref<InstanceType<typeof SearchInput> | null>(null);
const searchHistory = ref<string[]>(loadHistory());

const flatResults = computed(() => {
  const items: SearchResult[] = [];
  for (const doc of results.value.documents) {
    items.push({
      id: doc.id,
      type: "document" as const,
      title: doc.title,
      content: doc.title,
      metadata: `问题: ${doc.questionCount}  |  回答: ${doc.answerCount}`,
    });
  }
  for (const q of results.value.questions) {
    items.push({
      id: q.id,
      type: "question" as const,
      title: q.text,
      content: q.text,
      metadata: `来自: ${q.documentTitle}`,
      documentId: q.documentId,
    });
  }
  for (const a of results.value.answers) {
    items.push({
      id: a.id,
      type: "answer" as const,
      title: a.content.slice(0, 50),
      content: a.content,
      metadata: `来自: ${a.questionText}`,
      documentId: a.documentId,
      questionId: a.questionId,
    });
  }
  for (const tag of results.value.tags) {
    items.push({
      id: tag.id,
      type: "tag" as const,
      title: tag.name,
      content: tag.name,
      metadata: `关联文档: ${tag.documentCount}`,
    });
  }
  return items;
});

const showHistory = computed(() => {
  return isOpen.value && !query.value.trim() && searchHistory.value.length > 0;
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
// 搜索请求序号：debounce 只清定时器不取消在途请求，旧请求晚于新请求返回时会覆盖结果；
// 每次发起搜索递增序号，响应回来时仅当序号仍为最新才写入 results，避免旧结果串台。
let searchSeq = 0;

function addToHistory(searchText: string) {
  if (!searchText.trim()) return;
  const history = searchHistory.value.filter((h) => h !== searchText);
  history.unshift(searchText);
  if (history.length > MAX_HISTORY) {
    history.pop();
  }
  searchHistory.value = history;
  saveHistory(history);
}

function removeFromHistory(searchText: string) {
  const history = searchHistory.value.filter((h) => h !== searchText);
  searchHistory.value = history;
  saveHistory(history);
}

function clearHistory() {
  searchHistory.value = [];
  saveHistory([]);
}

// 切换正则模式；若搜索框已有内容，立即按新模式重新搜索
function toggleRegex() {
  isRegex.value = !isRegex.value;
  if (query.value.trim()) {
    handleSearch(query.value);
  }
}

async function handleSearch(searchText: string) {
  query.value = searchText;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (!searchText.trim()) {
    results.value = {
      documents: [],
      questions: [],
      answers: [],
      tags: [],
    };
    selectedIndex.value = -1;
    searchError.value = "";
    return;
  }

  debounceTimer = setTimeout(async () => {
    const currentSeq = ++searchSeq;
    isLoading.value = true;
    try {
      const res = isRegex.value
        ? await window.electronAPI.search.querySearchRegex(searchText)
        : await window.electronAPI.search.querySearch(searchText);
      // 仅当本次请求仍是最新时才写入，防止旧请求覆盖新结果
      if (currentSeq !== searchSeq) return;
      results.value = res;
      searchError.value = "";
      selectedIndex.value = flatResults.value.length > 0 ? 0 : -1;
    } catch (error) {
      if (currentSeq !== searchSeq) return;
      // 禁止静默失败：非法正则等错误必须在界面可见
      searchError.value = isRegex.value
        ? `正则表达式无效：${searchText}`
        : `搜索失败：${String(error)}`;
      results.value = {
        documents: [],
        questions: [],
        answers: [],
        tags: [],
      };
      selectedIndex.value = -1;
    } finally {
      if (currentSeq === searchSeq) {
        isLoading.value = false;
      }
    }
  }, 300);
}

function open() {
  isOpen.value = true;
  query.value = "";
  results.value = {
    documents: [],
    questions: [],
    answers: [],
    tags: [],
  };
  selectedIndex.value = -1;
  showHelp.value = false;
  setTimeout(() => {
    inputRef.value?.focus();
  }, 50);
}

function close() {
  const lastQuery = query.value;
  isOpen.value = false;
  query.value = "";
  if (lastQuery.trim()) {
    addToHistory(lastQuery);
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      if (selectedIndex.value < flatResults.value.length - 1) {
        selectedIndex.value++;
      }
      break;
    case "ArrowUp":
      e.preventDefault();
      if (selectedIndex.value > 0) {
        selectedIndex.value--;
      }
      break;
    case "Enter":
      e.preventDefault();
      if (selectedIndex.value >= 0) {
        selectCurrent();
      }
      break;
  }
}

function selectCurrent() {
  const item = flatResults.value[selectedIndex.value];
  if (item) {
    if (query.value.trim()) {
      addToHistory(query.value);
    }
    emit("select", { item, searchText: query.value });
    close();
  }
}

function handleSelect(data: { item: SearchResult; searchText: string }) {
  if (data.searchText.trim()) {
    addToHistory(data.searchText);
  }
  emit("select", data);
  close();
}

function handleHistoryClick(searchText: string) {
  query.value = searchText;
  handleSearch(searchText);
  inputRef.value?.focus();
}

const emit = defineEmits<{
  (e: "select", data: { item: SearchResult; searchText: string }): void;
}>();

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  window.electronAPI.onOpenSearch(() => {
    open();
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="search-modal" @click.self="showHelp = false">
      <div class="search-modal__container">
        <button class="search-modal__close" @click="close" title="关闭">×</button>
        <SearchInput
          ref="inputRef"
          :value="query"
          :regex-mode="isRegex"
          @search="handleSearch"
          @close="close"
          @toggle-regex="toggleRegex"
          @toggle-help="showHelp = !showHelp"
        />

        <div v-if="showHelp" class="search-modal__help">
          <h4>何时用正则搜索</h4>
          <ul>
            <li>找特定前缀或结构：<code>^//</code> 行首注释、<code>^TODO</code></li>
            <li>找含符号的精确片段：<code>// language</code></li>
            <li>找日期/编号等格式：<code>\d{4}-\d{2}-\d{2}</code></li>
            <li>排除式匹配：<code>TODO(?!:)</code> 匹配 TODO 但不是 "TODO:"</li>
          </ul>
          <h4>何时用普通搜索</h4>
          <ul>
            <li>模糊找相关内容：多个词都出现即可，忽略标点与大小写</li>
          </ul>
          <h4>常用语法</h4>
          <table class="search-modal__help-table">
            <tbody>
              <tr>
                <td><code>^</code></td>
                <td>行首</td>
                <td><code>^//</code> 行首的 //</td>
              </tr>
              <tr>
                <td><code>$</code></td>
                <td>行尾</td>
                <td><code>end$</code> 行尾的 end</td>
              </tr>
              <tr>
                <td><code>.</code></td>
                <td>任意单个字符</td>
                <td><code>a.c</code> → abc、a1c</td>
              </tr>
              <tr>
                <td><code>*</code></td>
                <td>前项出现 0 次或多次</td>
                <td><code>a*</code> → 空、a、aa</td>
              </tr>
              <tr>
                <td><code>+</code></td>
                <td>前项出现 1 次或多次</td>
                <td><code>a+</code> → a、aa</td>
              </tr>
              <tr>
                <td><code>?</code></td>
                <td>前项出现 0 或 1 次</td>
                <td><code>colou?r</code> → color、colour</td>
              </tr>
              <tr>
                <td><code>\d \s \w</code></td>
                <td>数字 / 空白 / 词字符</td>
                <td><code>\d+</code> 连续数字</td>
              </tr>
              <tr>
                <td><code>[abc]</code></td>
                <td>字符集</td>
                <td><code>[0-9]</code> 数字</td>
              </tr>
              <tr>
                <td><code>(a|b)</code></td>
                <td>分组或</td>
                <td><code>cat|dog</code> → cat 或 dog</td>
              </tr>
              <tr>
                <td><code>(?!...)</code></td>
                <td>负向前瞻</td>
                <td><code>TODO(?!:)</code> 排除 "TODO:"</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="searchError" class="search-modal__error">{{ searchError }}</div>

        <div v-if="isLoading" class="search-modal__loading">搜索中...</div>

        <SearchResultsComponent
          v-else-if="flatResults.length > 0"
          :results="results"
          :flat-results="flatResults"
          :selected-index="selectedIndex"
          :query="query"
          :regex-mode="isRegex"
          @select="handleSelect"
          @hover="(index) => (selectedIndex = index)"
        />

        <div v-else-if="showHistory" class="search-modal__history">
          <div class="search-modal__history-header">
            <span class="search-modal__history-title">最近搜索</span>
            <button class="search-modal__history-clear" @click="clearHistory">清除</button>
          </div>
          <div class="search-modal__history-list">
            <div
              v-for="(historyItem, index) in searchHistory"
              :key="index"
              class="search-modal__history-item"
              @click="handleHistoryClick(historyItem)"
            >
              <span class="search-modal__history-text">🔍 {{ historyItem }}</span>
              <button
                class="search-modal__history-remove"
                @click.stop="removeFromHistory(historyItem)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="query.trim()" class="search-modal__empty">未找到匹配结果</div>

        <div class="search-modal__hint"><span>↑↓</span> 导航 <span>Enter</span> 跳转</div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-global-search);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-modal__container {
  position: relative;
  width: 90vw;
  height: 90vh;
  background: var(--color-surface);
  opacity: 0.95;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 右上角关闭按钮，absolute 不占布局空间 */
.search-modal__close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--color-hover);
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-modal__close:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.search-modal__loading,
.search-modal__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 16px;
}

.search-modal__error {
  padding: 12px 32px;
  background: var(--color-danger-bg, rgba(255, 77, 79, 0.12));
  color: var(--color-danger, #ff4d4f);
  font-size: 14px;
}

.search-modal__help {
  position: absolute;
  top: 72px;
  right: 40px;
  width: 640px;
  max-height: calc(100% - 100px);
  overflow-y: auto;
  padding: 16px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: var(--z-modal);
  font-size: 13px;
  line-height: 1.6;
}

.search-modal__help h4 {
  margin: 10px 0 4px;
  font-size: 13px;
  color: var(--color-text);
}

.search-modal__help h4:first-child {
  margin-top: 0;
}

.search-modal__help ul {
  margin: 0;
  padding-left: 18px;
}

.search-modal__help li {
  color: var(--color-text-secondary);
}

.search-modal__help code {
  font-family: var(--font-mono);
  background: var(--color-hover);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--color-text);
}

.search-modal__help-table {
  width: 100%;
  border-collapse: collapse;
}

.search-modal__help-table td {
  padding: 3px 6px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.search-modal__help-table td:first-child {
  width: 130px;
  font-family: var(--font-mono);
}

.search-modal__help-table td:last-child {
  font-family: var(--font-mono);
  color: var(--color-text);
  text-align: right;
}

.search-modal__history {
  flex: 1;
  overflow-y: auto;
}

.search-modal__history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.search-modal__history-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.search-modal__history-clear {
  font-size: 14px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.search-modal__history-clear:hover {
  background: var(--color-hover);
  color: var(--color-text);
}

.search-modal__history-list {
  padding: 8px 0;
}

.search-modal__history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  cursor: pointer;
}

.search-modal__history-item:hover {
  background: var(--color-hover);
}

.search-modal__history-text {
  font-size: 16px;
  color: var(--color-text);
}

.search-modal__history-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--color-hover);
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
}

.search-modal__history-item:hover .search-modal__history-remove {
  opacity: 1;
}

.search-modal__history-remove:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.search-modal__hint {
  padding: 12px 24px;
  font-size: 14px;
  color: var(--color-text-secondary);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 16px;
}

.search-modal__hint span {
  background: var(--color-hover);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
}
</style>
