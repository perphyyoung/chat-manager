<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from "vue";
import ThreeColumnLayout from "./components/Layout/ThreeColumnLayout.vue";
import SettingsModal from "./components/Settings/SettingsModal.vue";
import SearchModal from "./components/Search/SearchModal.vue";
import { useDocumentStore } from "./stores/document";
import { useSettingsStore } from "./stores/settings";
import { LogLevel } from "@/infrastructure/constants/logLevel";

const documentStore = useDocumentStore();
const settingsStore = useSettingsStore();
const isSettingsOpen = ref(false);

function logToFile(level: string, message: string) {
  console.log(`[App.vue] ${message}`);
  window.electronAPI.logToFile(level, message);
}

function openSettings() {
  isSettingsOpen.value = true;
}

async function handleSearchSelect(data: {
  item: {
    id: string;
    type: string;
    documentId?: string;
    questionId?: string;
  };
  searchText: string;
}) {
  const { item, searchText } = data;

  switch (item.type) {
    case "document":
      await documentStore.selectDocument(item.id);
      break;
    case "question":
      if (item.documentId) {
        await documentStore.selectDocument(item.documentId);
        await nextTick();
        documentStore.setActiveQuestion(item.id);
        scrollToQuestion(item.id);
        documentStore.setHighlightText(searchText);
      }
      break;
    case "answer":
      if (item.documentId && item.questionId) {
        await documentStore.selectDocument(item.documentId);
        await nextTick();
        documentStore.setActiveQuestion(item.questionId);
        scrollToQuestion(item.questionId);
        documentStore.setHighlightText(searchText);
      }
      break;
    case "tag":
      documentStore.setTagFilter(item.id);
      break;
  }
}

function scrollToQuestion(questionId: string) {
  nextTick(() => {
    const element = document.querySelector(
      `[data-question-id="${questionId}"]`,
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

onMounted(() => {
  documentStore.loadDocuments();
  settingsStore.init();

  if (window.electronAPI.onOpenSettings) {
    window.electronAPI.onOpenSettings(openSettings);
  } else {
    logToFile(
      LogLevel.ERROR,
      "window.electronAPI.onOpenSettings not available",
    );
  }

  // 全局 Ctrl+F 监听器（编辑器焦点时不触发，由 CodeMirror 处理）
  document.addEventListener("keydown", handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleGlobalKeydown);
});

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === "f") {
    // 检查焦点是否在 CodeMirror 编辑器内
    const activeElement = document.activeElement;
    const isInEditor = activeElement?.closest(".cm-editor");
    if (!isInEditor) {
      e.preventDefault();
      window.electronAPI.openSearch();
    }
  }
}
</script>

<template>
  <ThreeColumnLayout />
  <SettingsModal :is-open="isSettingsOpen" @close="isSettingsOpen = false" />
  <SearchModal @select="handleSearchSelect" />
</template>

<style scoped></style>
