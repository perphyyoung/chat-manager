<script setup lang="ts">
interface Props {
  count?: number
  title?: string
}

withDefaults(defineProps<Props>(), {
  count: 0,
  title: '回收站',
})

const emit = defineEmits<{
  click: []
}>()

function handleClick() {
  emit('click')
}
</script>

<template>
  <button class="recycle-bin-btn" :title="title" @click="handleClick">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
    <span v-if="count > 0" class="recycle-bin-badge">{{ count }}</span>
  </button>
</template>

<style scoped>
.recycle-bin-btn {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.recycle-bin-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  color: var(--color-text);
}

.recycle-bin-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.recycle-bin-btn svg {
  width: 22px;
  height: 22px;
}

.recycle-bin-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
