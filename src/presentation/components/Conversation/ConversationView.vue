<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import { useDocumentStore } from "../../stores/document";
import QuestionBubble from "./QuestionBubble.vue";
import AnswerBubble from "./AnswerBubble.vue";
import TagSelector from "../Document/TagSelector.vue";

const props = defineProps<{
  isFullscreen?: boolean;
}>();

const emit = defineEmits<{
  toggleFullscreen: [];
}>();

const documentStore = useDocumentStore();
const messagesContainer = ref<HTMLElement | null>(null);

// 将问答对转换为可渲染的列表
const qaPairs = computed(() => {
  const doc = documentStore.selectedDocument;
  if (!doc) return [];

  return doc.questions.map((question) => {
    const answer = doc.answers.find((a) => a.questionId === question.id);
    return {
      question,
      answer,
    };
  });
});

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

function scrollToQuestion(questionId: string) {
  nextTick(() => {
    if (!messagesContainer.value) return;
    const targetElement = messagesContainer.value.querySelector(
      `[data-question-id="${questionId}"]`,
    );
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

// 监听回答变化，只在新增回答时滚动到底部
watch(
  () => documentStore.selectedDocument?.answers.length,
  (newLength, oldLength) => {
    // 只有在新增回答时才滚动到底部
    if (newLength && oldLength && newLength > oldLength) {
      scrollToBottom();
    }
  },
);

// 监听 activeQuestionId 变化，滚动到对应问题
watch(
  () => documentStore.activeQuestionId,
  (questionId) => {
    if (questionId) {
      scrollToQuestion(questionId);
    }
  },
);

function toggleFullscreen() {
  emit("toggleFullscreen");
}
</script>

<template>
  <div class="conversation-view">
    <div
      v-if="documentStore.selectedDocument"
      class="conversation-view__content"
    >
      <div class="conversation-view__header">
        <div class="header-row">
          <h2 class="conversation-view__title">
            {{ documentStore.selectedDocument.title }}
          </h2>
          <button
            class="fullscreen-btn"
            :title="props.isFullscreen ? '退出全屏' : '全屏专注'"
            @click="toggleFullscreen"
          >
            {{ props.isFullscreen ? "⤫" : "⤢" }}
          </button>
        </div>
        <TagSelector />
      </div>
      <div ref="messagesContainer" class="conversation-view__messages">
        <div
          v-for="{ question, answer } in qaPairs"
          :key="question.id"
          class="qa-pair"
          :data-question-id="question.id"
        >
          <!-- 问题：右对齐，主题色背景 -->
          <QuestionBubble :text="question.text" />

          <!-- 回答：左对齐，表面色背景 -->
          <AnswerBubble
            v-if="answer"
            :key="`${documentStore.selectedDocumentId}-${answer.id}`"
            :content="answer.content"
            :answer-id="answer.id"
            @update="documentStore.updateAnswerContent"
          />
          <div v-else class="answer-placeholder">暂无回答</div>
        </div>
      </div>
    </div>
    <div v-else class="conversation-view__empty">
      <p>请选择一个文档查看对话内容</p>
    </div>
  </div>
</template>

<style scoped>
.conversation-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
}

.conversation-view__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.conversation-view__header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.conversation-view__title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.fullscreen-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.fullscreen-btn:hover {
  background-color: var(--color-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.conversation-view__messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.qa-pair {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-placeholder {
  padding: 12px 16px;
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: 14px;
  margin-right: auto;
}

.conversation-view__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}
</style>
