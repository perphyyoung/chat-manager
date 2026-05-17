<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useDocumentStore } from '../../stores/document'
import MessageBubble from './MessageBubble.vue'

const documentStore = useDocumentStore()
const messagesContainer = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(
  () => documentStore.selectedDocument?.conversation.messages,
  () => {
    scrollToBottom()
  },
  { immediate: true }
)
</script>

<template>
  <div class="conversation-view">
    <div v-if="documentStore.selectedDocument" class="conversation-view__content">
      <div ref="messagesContainer" class="conversation-view__messages">
        <MessageBubble
          v-for="message in documentStore.selectedDocument.conversation.messages"
          :key="message.id"
          :message="message"
        />
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
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
