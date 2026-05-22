<script setup lang="ts">
import { ref, computed } from 'vue'

interface RecycleBinItem {
  id: string
  name: string
  deletedAt: Date
  type: 'document' | 'question'
}

interface Props {
  show: boolean
  title: string
  items: RecycleBinItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  restore: [itemId: string]
  delete: [itemId: string]
  clear: []
}>()

const isRestoring = ref<string | null>(null)
const isDeleting = ref<string | null>(null)
const isClearing = ref(false)

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime())
})

function handleClose() {
  emit('close')
}

async function handleRestore(itemId: string) {
  isRestoring.value = itemId
  try {
    emit('restore', itemId)
  } finally {
    isRestoring.value = null
  }
}

async function handleDelete(itemId: string) {
  isDeleting.value = itemId
  try {
    emit('delete', itemId)
  } finally {
    isDeleting.value = null
  }
}

async function handleClear() {
  if (!confirm('确定要清空回收站吗？所有项目将被永久删除，此操作不可恢复。')) {
    return
  }
  isClearing.value = true
  try {
    emit('clear')
  } finally {
    isClearing.value = false
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="handleClose">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="btn-close" @click="handleClose">×</button>
        </div>

        <div class="modal-body">
          <div v-if="items.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <p>回收站是空的</p>
          </div>

          <div v-else class="items-list">
            <div
              v-for="item in sortedItems"
              :key="item.id"
              class="recycle-item"
            >
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-date">删除于 {{ formatDate(item.deletedAt) }}</span>
              </div>
              <div class="item-actions">
                <button
                  class="btn-restore"
                  :disabled="isRestoring === item.id"
                  @click="handleRestore(item.id)"
                >
                  {{ isRestoring === item.id ? '恢复中...' : '恢复' }}
                </button>
                <button
                  class="btn-delete"
                  :disabled="isDeleting === item.id"
                  @click="handleDelete(item.id)"
                >
                  {{ isDeleting === item.id ? '删除中...' : '删除' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="items.length > 0" class="modal-footer">
          <button
            class="btn-clear"
            :disabled="isClearing"
            @click="handleClear"
          >
            {{ isClearing ? '清空中...' : '清空回收站' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal {
  background-color: var(--color-surface);
  border-radius: 12px;
  width: 480px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.btn-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--color-text-secondary);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.items-list {
  padding: 8px;
}

.recycle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.recycle-item:hover {
  background-color: var(--color-hover);
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-restore,
.btn-delete {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-restore {
  background-color: var(--color-primary);
  color: white;
}

.btn-restore:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-delete {
  background-color: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
}

.btn-delete:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.1);
}

.btn-restore:disabled,
.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: center;
}

.btn-clear {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.1);
}

.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
