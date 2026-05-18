import { defineStore } from "pinia";
import { ref } from "vue";
import { SettingsApplicationService } from "@/application/services/SettingsApplicationService";
import { LocalStorageSettingsRepository } from "@/infrastructure/storage/LocalStorageSettingsRepository";
import { globalEventBus } from "@/domain/events";

const settingsRepo = new LocalStorageSettingsRepository();
const settingsService = new SettingsApplicationService(
  settingsRepo,
  globalEventBus,
);

export const useSettingsStore = defineStore("settings", () => {
  const isDarkMode = ref(false);

  function updateDocumentClass(dark: boolean) {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  async function init() {
    const settings = await settingsService.loadSettings();
    isDarkMode.value = settings.darkMode;
    updateDocumentClass(isDarkMode.value);
  }

  async function toggleDarkMode() {
    const newDarkMode = await settingsService.toggleTheme();
    isDarkMode.value = newDarkMode;
    updateDocumentClass(newDarkMode);
  }

  return {
    isDarkMode,
    toggleDarkMode,
    init,
  };
});
