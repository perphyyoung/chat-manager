import { defineStore } from "pinia";
import { ref } from "vue";
import { SettingsApplicationService } from "@/application/services/SettingsApplicationService";
import { LocalStorageSettingsRepository } from "@/infrastructure/storage/LocalStorageSettingsRepository";
import { globalEventBus } from "@/domain/events";

const settingsRepo = new LocalStorageSettingsRepository();
const settingsService = new SettingsApplicationService(settingsRepo, globalEventBus);

const DEFAULT_ANSWER_MAX_LINES = 10;
const MAX_ANSWER_MAX_LINES = 100;

// 行数配置只接受 0（不限制）到 100 的整数；非法值回落到默认 10
function normalizeAnswerMaxLines(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return DEFAULT_ANSWER_MAX_LINES;
  }
  return Math.min(MAX_ANSWER_MAX_LINES, Math.floor(num));
}

export const useSettingsStore = defineStore("settings", () => {
  const isDarkMode = ref(false);
  // 用户自定义字体：CSS 值（如 "Segoe UI", sans-serif），空串表示跟随系统默认栈
  const fontFamily = ref("");
  const monoFontFamily = ref("");
  // 回答默认显示的最大行数；0 表示不限制
  const answerMaxLines = ref(DEFAULT_ANSWER_MAX_LINES);

  function updateDocumentClass(dark: boolean) {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  // 将字体设置写入 CSS 变量，空值恢复默认栈（不设变量）
  function applyFontVariables() {
    const root = document.documentElement.style;
    if (fontFamily.value) {
      root.setProperty("--font-family", fontFamily.value);
    } else {
      root.removeProperty("--font-family");
    }
    if (monoFontFamily.value) {
      root.setProperty("--font-mono", monoFontFamily.value);
    } else {
      root.removeProperty("--font-mono");
    }
  }

  async function init() {
    const settings = await settingsService.loadSettings();
    isDarkMode.value = settings.darkMode;
    fontFamily.value = (settings.fontFamily as string) ?? "";
    monoFontFamily.value = (settings.monoFontFamily as string) ?? "";
    answerMaxLines.value = normalizeAnswerMaxLines(settings.answerMaxLines);
    updateDocumentClass(isDarkMode.value);
    applyFontVariables();
  }

  async function toggleDarkMode() {
    const newDarkMode = await settingsService.toggleTheme();
    isDarkMode.value = newDarkMode;
    updateDocumentClass(newDarkMode);
  }

  async function setFontFamily(value: string) {
    fontFamily.value = value;
    applyFontVariables();
    await settingsService.updateSetting("fontFamily", value);
  }

  async function setMonoFontFamily(value: string) {
    monoFontFamily.value = value;
    applyFontVariables();
    await settingsService.updateSetting("monoFontFamily", value);
  }

  async function setAnswerMaxLines(value: number) {
    const normalized = normalizeAnswerMaxLines(value);
    answerMaxLines.value = normalized;
    await settingsService.updateSetting("answerMaxLines", normalized);
  }

  return {
    isDarkMode,
    fontFamily,
    monoFontFamily,
    answerMaxLines,
    toggleDarkMode,
    setFontFamily,
    setMonoFontFamily,
    setAnswerMaxLines,
    init,
  };
});
