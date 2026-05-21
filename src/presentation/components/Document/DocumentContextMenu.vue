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
    <button class="menu-item" @click="handleEdit">编辑标题</button>
    <button class="menu-item menu-item--danger" @click="handleDelete">删除文档</button>
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
  display: block;
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
</style>
