<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

interface Props {
  x: number
  y: number
}

defineProps<Props>()

const emit = defineEmits<{
  edit: []
  delete: []
  close: []
}>()

function handleEdit() {
  emit('edit')
  emit('close')
}

function handleDelete() {
  emit('delete')
  emit('close')
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.context-menu')) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="context-menu" :style="{ left: `${x}px`, top: `${y}px` }">
    <button class="menu-item" @click="handleEdit">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      <span>编辑标题</span>
    </button>
    <button class="menu-item menu-item--danger" @click="handleDelete">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      <span>删除文档</span>
    </button>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 140px;
  z-index: 1000;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background-color: transparent;
  color: var(--color-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: var(--color-hover);
}

.menu-item--danger {
  color: #ef4444;
}

.menu-item--danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.menu-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
