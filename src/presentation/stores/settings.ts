import { defineStore } from "pinia";
import { ref } from "vue";
import { SettingsApplicationService } from "@/application/services/SettingsApplicationService";
import { LocalStorageSettingsRepository } from "@/infrastructure/storage/LocalStorageSettingsRepository";
import { globalEventBus } from "@/domain/events";

const settingsRepo = new LocalStorageSettingsRepository();
const settingsService = new SettingsApplicationService(settingsRepo, globalEventBus);

export const useSettingsStore = defineStore("settings", () => {
  const isDarkMode = ref(false);
  // 用户自定义字体：CSS 值（如 "Segoe UI", sans-serif），空串表示跟随系统默认栈
  const fontFamily = ref("");
  const monoFontFamily = ref("");

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

  return {
    isDarkMode,
    fontFamily,
    monoFontFamily,
    toggleDarkMode,
    setFontFamily,
    setMonoFontFamily,
    init,
  };
});
