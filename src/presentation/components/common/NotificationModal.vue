<script setup lang="ts">
interface Props {
  show: boolean;
  title: string;
  message: string;
  details?: string[];
  confirmText?: string;
}

withDefaults(defineProps<Props>(), {
  details: () => [],
  confirmText: "确定",
});

const emit = defineEmits<{
  confirm: [];
}>();

function handleConfirm() {
  emit("confirm");
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="notification-overlay" @click.self="handleConfirm">
      <div class="notification-dialog">
        <h4>{{ title }}</h4>
        <p class="notification-message">{{ message }}</p>
        <div v-if="details.length > 0" class="notification-details">
          <div v-for="(detail, index) in details" :key="index" class="notification-detail-item">
            {{ detail }}
          </div>
        </div>
        <div class="notification-actions">
          <button class="btn-primary" @click="handleConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-overlay);
}

.notification-dialog {
  background-color: var(--color-surface);
  border-radius: 12px;
  padding: 20px;
  width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.notification-dialog h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.notification-message {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.notification-details {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 16px;
  padding: 8px;
  background-color: var(--color-background);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.notification-detail-item {
  padding: 4px 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.notification-detail-item:last-child {
  border-bottom: none;
}

.notification-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: var(--color-primary);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
