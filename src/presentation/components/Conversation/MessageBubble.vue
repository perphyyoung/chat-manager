<script setup lang="ts">
interface MessageProp {
  id: string
  type: string
  content: string
  questionId?: string
}

interface Props {
  message: MessageProp
}

defineProps<Props>()
</script>

<template>
  <div
    class="message-bubble"
    :class="{
      'message-bubble--question': message.type === 'question',
      'message-bubble--answer': message.type === 'answer',
    }"
  >
    <div class="message-bubble__content">
      {{ message.content }}
    </div>
  </div>
</template>

<style scoped>
.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-bubble--question {
  align-self: flex-end;
  background-color: var(--color-primary);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-bubble--answer {
  align-self: flex-start;
  background-color: var(--color-surface);
  color: var(--color-text);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message-bubble__content {
  font-size: 14px;
  line-height: 1.5;
}
</style>
