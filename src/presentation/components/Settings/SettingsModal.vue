<script setup lang="ts">
import { ref, onMounted, inject } from "vue";
import { useSettingsStore } from "../../stores/settings";
import { useDocumentStore } from "../../stores/document";
import FontSelect from "./FontSelect.vue";

const settingsStore = useSettingsStore();
const documentStore = useDocumentStore();
const showToast = inject<(message: string) => void>("showToast");

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dataPath = ref("");
const appVersion = ref("");

onMounted(async () => {
  dataPath.value = await window.electronAPI.getDataPath();
  appVersion.value = await window.electronAPI.getVersion();
});

function handleClose() {
  emit("close");
}

async function handleOpenDataDir() {
  await window.electronAPI.openDataDir();
}

// 所有文档的问题序号从 1 起强制重排（迁移存量 0 起数据）；无变更时不提示改动
async function handleReorderAllQuestions() {
  try {
    const count = await documentStore.reorderAllQuestions();
    showToast?.(
      count > 0 ? `已完成 ${count} 个文档的问题序号重排` : "所有文档的问题序号已连续，无需调整",
    );
  } catch (error) {
    window.electronAPI.renderLog("error", `[SettingsModal] 问题列表重新排序失败: ${String(error)}`);
    showToast?.("问题列表重新排序失败");
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>设置</h2>
        <div class="header-center">Chat Manager v{{ appVersion }}</div>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      <div class="modal-body">
        <div class="setting-item">
          <span>深色主题</span>
          <label class="switch">
            <input
              type="checkbox"
              :checked="settingsStore.isDarkMode"
              @change="settingsStore.toggleDarkMode"
            />
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="font-info">
            <span class="font-label">全部字体</span>
            <span class="font-desc">界面正文等非代码区域，可选等宽字体</span>
          </div>
          <FontSelect
            :model-value="settingsStore.fontFamily"
            @update:model-value="settingsStore.setFontFamily"
          />
        </div>
        <div class="setting-item">
          <div class="font-info">
            <span class="font-label">等宽字体</span>
            <span class="font-desc">编辑器与代码块等代码区域</span>
          </div>
          <FontSelect
            mono-only
            :model-value="settingsStore.monoFontFamily"
            @update:model-value="settingsStore.setMonoFontFamily"
          />
        </div>
        <div class="setting-item">
          <div class="dir-info">
            <span class="dir-label">数据目录</span>
            <span class="dir-path" :title="dataPath">
              {{ dataPath || "加载中…" }}
            </span>
          </div>
          <button class="open-btn" @click="handleOpenDataDir">打开文件夹</button>
        </div>
        <div class="setting-item">
          <div class="dir-info">
            <span class="dir-label">问题列表重新排序</span>
            <span class="dir-path">所有文档的问题序号从 1 起重新编号</span>
          </div>
          <button class="open-btn" @click="handleReorderAllQuestions">重新排序</button>
        </div>
      </div>
    </div>
  </div>
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
  z-index: var(--z-settings);
}

.modal-content {
  background-color: var(--color-surface);
  border-radius: 10px;
  width: 640px;
  max-width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--color-text);
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  white-space: nowrap;
  color: var(--color-text-secondary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.modal-body {
  padding: 24px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  gap: 16px;
  color: var(--color-text);
}

.setting-item + .setting-item {
  margin-top: 24px;
}

.setting-item--column {
  flex-direction: column;
  align-items: stretch;
}

.font-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.font-label {
  font-size: 14px;
  color: var(--color-text);
}

.font-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.dir-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.dir-label {
  font-size: 14px;
  color: var(--color-text);
}

.dir-path {
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-text-secondary);
  word-break: break-all;
  user-select: text;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.open-btn {
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: none;
  color: var(--color-text);
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.open-btn:hover {
  background-color: var(--color-border);
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--color-primary);
}

input:checked + .slider:before {
  transform: translateX(24px);
}
</style>
