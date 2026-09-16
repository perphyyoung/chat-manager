<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    disabled?: boolean;
  }>(),
  {
    title: "添加",
    disabled: false,
  },
);

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button class="add-fab" :title="title" :disabled="disabled" @click="emit('click')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  </button>
</template>

<style scoped>
.add-fab {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  opacity: 0.5;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    opacity 0.2s;
}

.add-fab:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.add-fab:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.add-fab:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
}

.add-fab svg {
  width: 24px;
  height: 24px;
}
</style>
