<script setup lang="ts">
import { watch, ref } from "vue";

interface Props {
  message: string;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  duration: 2000,
});

const emit = defineEmits<{
  close: [];
}>();

const visible = ref(false);

watch(
  () => props.message,
  (newMessage, oldMessage) => {
    if (newMessage && newMessage !== oldMessage) {
      visible.value = true;
      setTimeout(() => {
        visible.value = false;
        emit("close");
      }, props.duration);
    }
  },
);

function handleClose() {
  visible.value = false;
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast" @click="handleClose">
        <span class="toast-message">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--color-text);
  color: var(--color-surface);
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 10002;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.toast-message {
  line-height: 1.4;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .toast {
    background-color: var(--color-surface);
    color: var(--color-text);
  }
}
</style>
