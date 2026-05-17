import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  const isDarkMode = ref(localStorage.getItem("darkMode") === "true");

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value;
  }

  watch(isDarkMode, (newValue) => {
    localStorage.setItem("darkMode", String(newValue));
    updateDocumentClass(newValue);
  });

  function updateDocumentClass(dark: boolean) {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function init() {
    updateDocumentClass(isDarkMode.value);
  }

  return {
    isDarkMode,
    toggleDarkMode,
    init,
  };
});
