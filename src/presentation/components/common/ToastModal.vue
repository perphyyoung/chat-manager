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
let timer: ReturnType<typeof setTimeout> | null = null;

function startTimer() {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    visible.value = false;
    emit("close");
  }, props.duration);
}

watch(
  () => props.message,
  (newMessage, oldMessage) => {
    if (newMessage && newMessage !== oldMessage) {
      visible.value = true;
      startTimer();
    }
  },
);

function handleClose() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
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
  padding: 12px 20px;
  border-radius: 8px;
  background: #0a0a0a;
  color: #00ff88;
  border: 2px solid #00ff88;
  box-shadow:
    0 0 20px rgba(0, 255, 136, 0.4),
    inset 0 0 10px rgba(0, 255, 136, 0.1);
  font-size: 14px;
  z-index: var(--z-toast);
  cursor: pointer;
}

.toast-message {
  line-height: 1.4;
}

.toast-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px) scale(0.95);
}
</style>
