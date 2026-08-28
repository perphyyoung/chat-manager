<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, provide } from "vue";
import ThreeColumnLayout from "./components/Layout/ThreeColumnLayout.vue";
import SettingsModal from "./components/Settings/SettingsModal.vue";
import SearchModal from "./components/Search/SearchModal.vue";
import NotificationModal from "./components/common/NotificationModal.vue";
import ToastModal from "./components/common/ToastModal.vue";
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
  notification.value = {
    show: true,
    title,
    message,
    details,
  };
}

// Toast 状态
const toastMessage = ref("");

function showToast(message: string) {
  toastMessage.value = message;
}

// 暴露给子组件使用
provide("showNotification", showNotification);
provide("showToast", showToast);

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
        scrollToQuestion(item.id, searchText);
        documentStore.setHighlightText(searchText);
      }
      break;
    case "answer":
      if (item.documentId && item.questionId) {
        await documentStore.selectDocument(item.documentId);
        await nextTick();
        documentStore.setActiveQuestion(item.questionId);
        scrollToQuestion(item.questionId, searchText);
        documentStore.setHighlightText(searchText);
      }
      break;
    case "tag":
      documentStore.setTagFilter(item.id);
      break;
  }
}

function findTextNode(el: Element, text: string): Text | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.textContent?.toLowerCase().includes(text.toLowerCase())) {
      return node as Text;
    }
    node = walker.nextNode();
  }
  return null;
}

function scrollToQuestion(questionId: string, searchText?: string) {
  nextTick(() => {
    const messagesContainer = document.querySelector(".conversation-view__messages");
    if (!messagesContainer) return;

    const qaPair = messagesContainer.querySelector(`[data-question-id="${questionId}"]`);
    if (!qaPair) return;

    qaPair.scrollIntoView({ behavior: "smooth", block: "start" });

    if (!searchText) return;

    const answerEl = qaPair.querySelector(".answer-bubble__content");
    if (!answerEl) return;

    const textNode = findTextNode(answerEl, searchText);
    if (!textNode) return;

    const parent = textNode.parentElement;
    const textContent = textNode.textContent || "";
    const lowerContent = textContent.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    const startIndex = lowerContent.indexOf(lowerSearch);
    if (startIndex === -1 || !parent) return;

    const beforeText = textContent.slice(0, startIndex);
    const matchText = textContent.slice(startIndex, startIndex + searchText.length);
    const afterText = textContent.slice(startIndex + searchText.length);

    parent.textContent = beforeText;
    const highlight = document.createElement("mark");
    highlight.style.background = "var(--color-highlight-bg)";
    highlight.style.padding = "1px 3px";
    highlight.style.borderRadius = "2px";
    highlight.textContent = matchText;
    parent.appendChild(highlight);
    parent.appendChild(document.createTextNode(afterText));

    setTimeout(() => {
      const containerRect = messagesContainer.getBoundingClientRect();
      const highlightRect = highlight.getBoundingClientRect();
      const relativeTop = highlightRect.top - containerRect.top;
      const containerScroll = messagesContainer.scrollTop;
      const containerHeight = messagesContainer.clientHeight;

      messagesContainer.scrollTo({
        top: containerScroll + relativeTop - containerHeight / 3,
        behavior: "instant",
      });
    }, 50);

    setTimeout(() => {
      parent.textContent = textContent;
    }, 3000);
  });
}

onMounted(() => {
  documentStore.loadDocuments();
  settingsStore.init();

  if (window.electronAPI.onOpenSettings) {
    window.electronAPI.onOpenSettings(openSettings);
  } else {
    window.electronAPI.renderLog("error", "window.electronAPI.onOpenSettings not available");
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

  // 监听 toast 事件
  if (window.electronAPI.onShowToast) {
    window.electronAPI.onShowToast((message) => {
      showToast(message);
    });
  }

  // 监听导出完成事件
  if (window.electronAPI.onExportComplete) {
    window.electronAPI.onExportComplete((result) => {
      if (result.success) {
        showNotification("导出成功", `文件已保存到：${result.filePath}`);
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
  <ToastModal :message="toastMessage" @close="toastMessage = ''" />
</template>

<style scoped></style>
