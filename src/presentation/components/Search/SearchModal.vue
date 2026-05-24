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

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function handleSearch(searchQuery: string) {
  query.value = searchQuery;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (!searchQuery.trim()) {
    results.value = { documents: [], questions: [], answers: [], tags: [] };
    selectedIndex.value = -1;
    return;
  }

  debounceTimer = setTimeout(async () => {
    isLoading.value = true;
    try {
      results.value = await window.electronAPI.search.query(searchQuery);
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
  isOpen.value = false;
  query.value = "";
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
    emit("select", item);
    close();
  }
}

function handleSelect(item: SearchResult) {
  emit("select", item);
  close();
}

const emit = defineEmits<{
  (e: "select", item: SearchResult): void;
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
