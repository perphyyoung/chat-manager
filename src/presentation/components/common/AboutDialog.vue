<script setup lang="ts">
import { ref, onMounted } from "vue";

interface Props {
  show: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

// 版本信息
const appVersion = ref("");
const electronVersion = ref("");
const nodeVersion = ref("");
const chromeVersion = ref("");

onMounted(async () => {
  const versions = await window.electronAPI.getVersions();
  appVersion.value = versions.app;
  electronVersion.value = versions.electron;
  nodeVersion.value = versions.node;
  chromeVersion.value = versions.chrome;
});

function handleClose() {
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="about-overlay" @click.self="handleClose">
      <div class="about-dialog">
        <div class="about-header">
          <h3>Chat Manager</h3>
          <p class="version">Version {{ appVersion }}</p>
        </div>
        <div class="about-content">
          <div class="version-info">
            <div class="version-row">
              <span class="label">Electron</span>
              <span class="value">{{ electronVersion }}</span>
            </div>
            <div class="version-row">
              <span class="label">Node.js</span>
              <span class="value">{{ nodeVersion }}</span>
            </div>
            <div class="version-row">
              <span class="label">Chrome</span>
              <span class="value">{{ chromeVersion }}</span>
            </div>
          </div>
        </div>
        <div class="about-footer">
          <button class="btn-primary" @click="handleClose">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.about-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.about-dialog {
  background-color: var(--color-surface);
  border-radius: 12px;
  padding: 24px;
  width: 320px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.about-header {
  text-align: center;
  margin-bottom: 20px;
}

.about-header h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
}

.version {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.about-content {
  margin-bottom: 20px;
}

.version-info {
  background-color: var(--color-background);
  border-radius: 8px;
  padding: 12px;
}

.version-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.version-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.version-row .label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.version-row .value {
  font-size: 13px;
  color: var(--color-text);
  font-family: "Monaco", "Menlo", "Consolas", monospace;
}

.about-footer {
  display: flex;
  justify-content: center;
}

.btn-primary {
  padding: 8px 32px;
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
