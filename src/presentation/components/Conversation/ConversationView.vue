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
  focusQuestion: [questionId: string];
  focusDocument: [questionId: string];
}>();

const documentStore = useDocumentStore();
const messagesContainer = ref<HTMLElement | null>(null);

// 将问答对转换为可渲染的列表
const qaPairs = computed(() => {
  const doc = documentStore.selectedDocument;
  if (!doc) return [];

  return doc.activeQuestions.map((question) => {
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
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
}

// 监听回答变化，只在同一文档内新增回答时滚动到底部；切换文档（id 变化）不触发
watch(
  () => [documentStore.selectedDocument?.id, documentStore.selectedDocument?.answers.length],
  ([newId, newLength], [oldId, oldLength]) => {
    if (oldId && newId === oldId && newLength && oldLength && newLength > oldLength) {
      scrollToBottom();
    }
  },
);

// 按文档 id 记忆中间面板滚动位置：切换时保存，返回时恢复（双 rAF 等渲染稳定后设置）
const docScrollPositions = new Map<string, number>();

watch(
  () => documentStore.selectedDocument?.id,
  (newId, oldId) => {
    if (oldId && messagesContainer.value) {
      docScrollPositions.set(oldId, messagesContainer.value.scrollTop);
    }
    if (newId) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = messagesContainer.value;
          if (!el) return;
          const saved = docScrollPositions.get(newId);
          if (saved !== undefined) {
            el.scrollTop = Math.min(saved, Math.max(0, el.scrollHeight - el.clientHeight));
          }
        });
      });
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

function handleShowInQuestionList(questionId: string) {
  documentStore.setActiveQuestion(questionId);
  emit("focusQuestion", questionId);
}

function handleShowInDocumentList(questionId: string) {
  emit("focusDocument", questionId);
}
</script>

<template>
  <div class="conversation-view">
    <div v-if="documentStore.selectedDocument" class="conversation-view__content">
      <div class="conversation-view__header">
        <div class="header-row">
          <h2 class="conversation-view__title">
            {{ documentStore.selectedDocument.title }}
          </h2>
          <TagSelector />
          <button
            class="fullscreen-btn"
            :title="props.isFullscreen ? '退出全屏' : '全屏专注'"
            @click="toggleFullscreen"
          >
            {{ props.isFullscreen ? "⤣" : "⤢" }}
          </button>
        </div>
      </div>
      <div ref="messagesContainer" class="conversation-view__messages">
        <div
          v-for="{ question, answer } in qaPairs"
          :key="question.id"
          class="qa-pair"
          :class="{
            'qa-pair--highlighted': question.id === documentStore.activeQuestionId,
          }"
          :data-question-id="question.id"
        >
          <!-- 问题：右对齐，主题色背景；左侧序号直接对应数据库 sort_order -->
          <div class="qa-pair__question-row">
            <span class="qa-index" aria-hidden="true">{{ question.order + 1 }}</span>
            <QuestionBubble
              :text="question.text"
              :question-id="question.id"
              @show-in-list="handleShowInQuestionList"
              @show-in-document-list="handleShowInDocumentList"
            />
          </div>

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
}

.conversation-view__title {
  flex: 0 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.fullscreen-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  margin-left: auto;
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
  transition:
    background-color 0.15s,
    border-color 0.15s,
    color 0.15s;
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
  border-radius: 8px;
  padding: 12px;
  margin: -12px;
  transition: background-color 0.3s ease;
}

/* 问题行：序号与气泡横向排布，整体靠右，序号紧贴气泡左侧 */
.qa-pair__question-row {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 8px;
}

/* 覆盖气泡自身的 margin-left: auto（会把序号顶到最左），row 已负责整体靠右 */
.qa-pair__question-row :deep(.question-bubble) {
  margin-left: 0;
}

/* 序号与问题列表 .question-item__number 同款：18px 蓝底白字圆，user-select 排除复制；align-self: center 与气泡垂直居中 */
.qa-index {
  flex-shrink: 0;
  align-self: center;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 600;
  user-select: none;
}

.qa-pair--highlighted {
  background-color: rgba(59, 130, 246, 0.08);
  animation: pulseHighlight 0.6s ease-out;
}

@keyframes pulseHighlight {
  0% {
    background-color: rgba(59, 130, 246, 0.2);
  }
  100% {
    background-color: rgba(59, 130, 246, 0.08);
  }
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
