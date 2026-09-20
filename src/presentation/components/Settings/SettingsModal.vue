<script setup lang="ts">
import { ref, onMounted, inject } from "vue";
import { useSettingsStore } from "../../stores/settings";
import { useDocumentStore } from "../../stores/document";

const settingsStore = useSettingsStore();
const documentStore = useDocumentStore();
const showToast = inject<(message: string) => void>("showToast");

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

interface FontOption {
  value: string;
  label: string;
}

// 字体英文 family → 中文显示名映射：来自数据目录 font-family-map.toml（主进程读取）
let fontDisplayNames: Record<string, string> = {};

// 字体显示名：优先中文名，附英文原文便于识别；无映射保持英文
function displayName(family: string): string {
  const zh = fontDisplayNames[family];
  return zh ? `${zh} (${family})` : family;
}

// 本机字体列表：queryLocalFonts 成功时动态枚举，失败时回退候选表
const standardFonts = ref<FontOption[]>([]);
const monoFonts = ref<FontOption[]>([]);

// Canvas 测量法结果缓存
const measureCache = new Map<string, boolean>();
const monoCache = new Map<string, boolean>();

// 提取 cssValue 中的第一个字体族名（兼容带引号与不带引号）
function extractFamily(cssValue: string): string | null {
  const match = cssValue.match(/"([^"]+)"|^([^,\s]+)/);
  return match?.[1] ?? match?.[2] ?? null;
}

// Canvas 测量法：字体存在时三个基准都渲染目标字体、宽度相等；
// 不存在时回退到三个不同基准、宽度互异。官方 FontFaceSet.check 对不存在的字体也返回 true，不可用。
function isInstalledByMeasure(family: string): boolean {
  const cached = measureCache.get(family);
  if (cached !== undefined) {
    return cached;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return true;
  }
  const text = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const fontSpec = `72px "${family}"`;
  ctx.font = `${fontSpec}, serif`;
  const wSerif = ctx.measureText(text).width;
  ctx.font = `${fontSpec}, sans-serif`;
  const wSans = ctx.measureText(text).width;
  ctx.font = `${fontSpec}, monospace`;
  const wMono = ctx.measureText(text).width;
  const installed = wSerif === wSans && wSans === wMono;
  measureCache.set(family, installed);
  return installed;
}

// 等宽字体名特征词：命中即判等宽，不依赖渲染（解决 canvas 对未激活字体的回退误判）
const MONO_KEYWORDS = [
  "Mono",
  "Menlo",
  "Consolas",
  "Courier",
  "Code",
  "Console",
  "JetBrains",
  "Fira",
  "Cascadia",
  "Term",
];

// 等宽判定：关键词命中直接判等宽；否则预加载字体后采样多字符宽度（等宽字体所有字符宽度相同）
async function isMonoFamily(family: string): Promise<boolean> {
  if (MONO_KEYWORDS.some((keyword) => family.includes(keyword))) {
    return true;
  }
  const cached = monoCache.get(family);
  if (cached !== undefined) {
    return cached;
  }
  // 预加载字体，避免 canvas 回退默认字体导致误判
  await document.fonts.load(`16px "${family}"`).catch(() => {});
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return false;
  }
  ctx.font = `16px "${family}"`;
  const widths = ["i", "W", "0", "l"].map((c) => ctx.measureText(c).width);
  const mono = widths.every((w) => w === widths[0]);
  monoCache.set(family, mono);
  return mono;
}

// 回退列表：queryLocalFonts 不可用时，候选表按 Canvas 测量法过滤可用项。
// "全部字体"含等宽候选，非代码区域也可选用等宽字体
function buildFallbackLists() {
  const all: FontOption[] = [];
  for (const list of [FONT_CANDIDATES.standard, FONT_CANDIDATES.mono]) {
    for (const font of list) {
      if (!font.value) {
        all.push(font);
        continue;
      }
      const family = extractFamily(font.value);
      if (family && isInstalledByMeasure(family)) {
        all.push(font);
      }
    }
  }
  standardFonts.value = all;
  monoFonts.value = FONT_CANDIDATES.mono.filter((f) => {
    if (!f.value) {
      return true;
    }
    const family = extractFamily(f.value);
    return family ? isInstalledByMeasure(family) : true;
  });
}

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
  // 先加载字体中文名映射，再构建字体列表，避免列表构建时映射未就绪
  fontDisplayNames = await window.electronAPI.getFontFamilyMap().catch(() => ({}));
  // 官方 Local Font Access API：动态枚举本机字体并按等宽性分类；拒绝授权或不可用时回退候选表
  const winWithFonts = window as unknown as {
    queryLocalFonts?: () => Promise<Array<{ family: string }>>;
  };
  if (typeof winWithFonts.queryLocalFonts === "function") {
    try {
      const fonts = await winWithFonts.queryLocalFonts();
      const families = [...new Set(fonts.map((f) => f.family))].sort((a, b) =>
        a.localeCompare(b, "zh-Hans-CN"),
      );
      const standards: FontOption[] = [{ value: "", label: "跟随系统" }];
      const monos: FontOption[] = [{ value: "", label: "跟随系统" }];
      // 并行判定等宽性（含字体预加载），再按顺序构建列表
      const monoFlags = await Promise.all(
        families.map(async (family) => await isMonoFamily(family)),
      );
      families.forEach((family, index) => {
        const isMono = monoFlags[index];
        // "全部字体"：标准与等宽都列出，非代码区域也可选用等宽字体
        standards.push({ value: `"${family}", sans-serif`, label: displayName(family) });
        if (isMono) {
          monos.push({ value: `"${family}", monospace`, label: displayName(family) });
        }
      });
      standardFonts.value = standards;
      monoFonts.value = monos;
      return;
    } catch {
      // 权限被拒或受限环境，走候选表回退
    }
  }
  buildFallbackLists();
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
          <select class="font-select" :value="settingsStore.fontFamily" @change="handleFontChange">
            <option
              v-for="font in standardFonts"
              :key="font.value"
              :value="font.value"
              :title="font.label"
            >
              {{ font.label }}
            </option>
          </select>
        </div>
        <div class="setting-item">
          <div class="font-info">
            <span class="font-label">等宽字体</span>
            <span class="font-desc">编辑器与代码块等代码区域</span>
          </div>
          <select
            class="font-select"
            :value="settingsStore.monoFontFamily"
            @change="handleMonoFontChange"
          >
            <option
              v-for="font in monoFonts"
              :key="font.value"
              :value="font.value"
              :title="font.label"
            >
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

.font-select {
  width: 300px;
  flex-shrink: 0;
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
