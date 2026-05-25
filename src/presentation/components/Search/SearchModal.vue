<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import SearchInput from "./SearchInput.vue";
import SearchResultsComponent from "./SearchResults.vue";
import type { SearchResults } from "../../../../env.d.ts";

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

async function handleSearch(searchText: string) {
  query.value = searchText;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (!searchText.trim()) {
    results.value = { documents: [], questions: [], answers: [], tags: [] };
    selectedIndex.value = -1;
    return;
  }

  debounceTimer = setTimeout(async () => {
    isLoading.value = true;
    try {
      results.value = await window.electronAPI.search.query(searchText);
      selectedIndex.value = flatResults.value.length > 0 ? 0 : -1;
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      isLoading.value = false;
    }
  }, 300);
}

function open() {
  isOpen.value = true;
  query.value = "";
  results.value = { documents: [], questions: [], answers: [], tags: [] };
  selectedIndex.value = -1;
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
    case "Escape":
      e.preventDefault();
      close();
      break;
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
    <div v-if="isOpen" class="search-modal" @click.self="close">
      <div class="search-modal__container">
        <SearchInput ref="inputRef" :value="query" @search="handleSearch" @close="close" />

        <div v-if="isLoading" class="search-modal__loading">
          搜索中...
        </div>

        <SearchResultsComponent
          v-else-if="flatResults.length > 0"
          :results="results"
          :flat-results="flatResults"
          :selected-index="selectedIndex"
          :query="query"
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

        <div v-else-if="query.trim()" class="search-modal__empty">
          未找到匹配结果
        </div>

        <div class="search-modal__hint">
          <span>↑↓</span> 导航
          <span>Enter</span> 跳转
          <span>Esc</span> 关闭
        </div>
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
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  z-index: 9999;
}

.search-modal__container {
  width: 600px;
  max-height: 70vh;
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.search-modal__loading,
.search-modal__empty {
  padding: 32px;
  text-align: center;
  color: var(--color-text-secondary);
}

.search-modal__history {
  max-height: 300px;
  overflow-y: auto;
}

.search-modal__history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.search-modal__history-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.search-modal__history-clear {
  font-size: 12px;
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
  padding: 10px 16px;
  cursor: pointer;
}

.search-modal__history-item:hover {
  background: var(--color-hover);
}

.search-modal__history-text {
  font-size: 14px;
  color: var(--color-text);
}

.search-modal__history-remove {
  width: 20px;
  height: 20px;
  border: none;
  background: var(--color-hover);
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
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
  padding: 8px 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 16px;
}

.search-modal__hint span {
  background: var(--color-hover);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
