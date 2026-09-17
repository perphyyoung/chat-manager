<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useSettingsStore } from "../../stores/settings";

const settingsStore = useSettingsStore();

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

// 候选字体表：value 为可直接写入 font-family 的 CSS 值，空串表示跟随系统默认栈
const FONT_CANDIDATES = {
  standard: [
    { value: "", label: "跟随系统" },
    { value: '"Segoe UI", sans-serif', label: "Segoe UI" },
    { value: '"Microsoft YaHei", sans-serif', label: "微软雅黑 (Microsoft YaHei)" },
    { value: '"PingFang SC", sans-serif', label: "苹方 (PingFang SC)" },
    { value: "Roboto, sans-serif", label: "Roboto" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: '"Helvetica Neue", sans-serif', label: "Helvetica Neue" },
    { value: '"Noto Sans SC", sans-serif', label: "思源黑体 (Noto Sans SC)" },
  ],
  mono: [
    { value: "", label: "跟随系统" },
    { value: "Consolas, monospace", label: "Consolas" },
    { value: '"Courier New", monospace', label: "Courier New" },
    { value: '"Cascadia Code", monospace', label: "Cascadia Code" },
    { value: '"JetBrains Mono", monospace', label: "JetBrains Mono" },
    { value: '"Fira Code", monospace', label: "Fira Code" },
    { value: '"Source Code Pro", monospace', label: "Source Code Pro" },
    { value: "Menlo, monospace", label: "Menlo" },
    { value: "Monaco, monospace", label: "Monaco" },
  ],
};

// 检测字体是否本机已安装；跟随系统项始终可用
function isFontAvailable(cssValue: string): boolean {
  if (!cssValue) {
    return true;
  }
  const match = cssValue.match(/"([^"]+)"|^([^,\s]+)/);
  const family = match?.[1] ?? match?.[2];
  return family ? document.fonts.check(`16px "${family}"`) : true;
}

// 仅列出本机已安装字体
const standardFonts = computed(() =>
  FONT_CANDIDATES.standard.filter((f) => isFontAvailable(f.value)),
);
const monoFonts = computed(() => FONT_CANDIDATES.mono.filter((f) => isFontAvailable(f.value)));

function handleFontChange(event: Event) {
  settingsStore.setFontFamily((event.target as HTMLSelectElement).value);
}

function handleMonoFontChange(event: Event) {
  settingsStore.setMonoFontFamily((event.target as HTMLSelectElement).value);
}

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
        <div class="setting-item setting-item--column">
          <span class="font-label">标准字体</span>
          <select class="font-select" :value="settingsStore.fontFamily" @change="handleFontChange">
            <option v-for="font in standardFonts" :key="font.value" :value="font.value">
              {{ font.label }}
            </option>
          </select>
        </div>
        <div class="setting-item setting-item--column">
          <span class="font-label">等宽字体</span>
          <select
            class="font-select"
            :value="settingsStore.monoFontFamily"
            @change="handleMonoFontChange"
          >
            <option v-for="font in monoFonts" :key="font.value" :value="font.value">
              {{ font.label }}
            </option>
          </select>
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
  z-index: var(--z-modal);
}

.modal-content {
  background-color: var(--color-surface);
  border-radius: 10px;
  width: 520px;
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

.font-label {
  font-size: 14px;
  color: var(--color-text);
}

.font-select {
  margin-top: 8px;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.font-select:focus {
  outline: none;
  border-color: var(--color-primary);
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
