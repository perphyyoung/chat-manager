<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useDocumentStore } from '../../stores/document'
import QuestionBubble from './QuestionBubble.vue'
import AnswerBubble from './AnswerBubble.vue'

const documentStore = useDocumentStore()
const messagesContainer = ref<HTMLElement | null>(null)

// 将问答对转换为可渲染的列表
const qaPairs = computed(() => {
  const doc = documentStore.selectedDocument
  if (!doc) return []

  return doc.questions.map(question => {
    const answer = doc.answers.find(a => a.questionId === question.id)
    return {
      question,
      answer
    }
  })
})

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(
  () => documentStore.selectedDocument?.answers,
  () => {
    scrollToBottom()
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="conversation-view">
    <div v-if="documentStore.selectedDocument" class="conversation-view__content">
      <div ref="messagesContainer" class="conversation-view__messages">
        <div
          v-for="{ question, answer } in qaPairs"
          :key="question.id"
          class="qa-pair"
        >
          <!-- 问题：右对齐，主题色背景 -->
          <QuestionBubble :text="question.text" />
          
          <!-- 回答：左对齐，表面色背景 -->
          <AnswerBubble
            v-if="answer"
            :content="answer.content"
          />
          <div v-else class="answer-placeholder">
            暂无回答
          </div>
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
