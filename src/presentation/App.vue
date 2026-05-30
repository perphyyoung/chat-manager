<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from "vue";
import ThreeColumnLayout from "./components/Layout/ThreeColumnLayout.vue";
import SettingsModal from "./components/Settings/SettingsModal.vue";
import SearchModal from "./components/Search/SearchModal.vue";
import NotificationModal from "./components/common/NotificationModal.vue";
import { useDocumentStore } from "./stores/document";
import { useSettingsStore } from "./stores/settings";

const documentStore = useDocumentStore();
const settingsStore = useSettingsStore();
const isSettingsOpen = ref(false);

// 通知弹窗状态
const notification = ref<{
  show: boolean;
  title: string;
  message: string;
  details: string[];
}>({ show: false, title: "", message: "", details: [] });

function showNotification(title: string, message: string, details: string[] = []) {
  notification.value = { show: true, title, message, details };
}

function hideNotification() {
  notification.value.show = false;
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
    window.electronAPI.renderLog("error", "window.electronAPI.onOpenSettings not available")
  }

  // 监听导入完成事件
  if (window.electronAPI.onImportComplete) {
    window.electronAPI.onImportComplete((result) => {
      if (result.success) {
        const details: string[] = [];
        if (result.skippedDocs && result.skippedDocs.length > 0) {
          details.push(`以下 ${result.skippedDocs.length} 个文档已存在，已跳过：`);
          details.push(...result.skippedDocs);
        }
        showNotification(
          "导入成功",
          `导入 ${result.importedDocCount} 个文档，${result.importedTagCount} 个标签`,
          details,
        );
        // 刷新文档列表和标签列表
        documentStore.loadDocuments();
        documentStore.loadTags();
      } else {
        showNotification("导入失败", result.error || "未知错误");
      }
    });
  }

  // 监听导出完成事件
  if (window.electronAPI.onExportComplete) {
    window.electronAPI.onExportComplete((result) => {
      if (result.success) {
        showNotification(
          "导出成功",
          `文件已保存到：${result.filePath}`,
        );
      } else {
        showNotification("导出失败", result.error || "未知错误");
      }
    });
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

  <NotificationModal
    :show="notification.show"
    :title="notification.title"
    :message="notification.message"
    :details="notification.details"
    @confirm="hideNotification"
  />
</template>

<style scoped></style>
