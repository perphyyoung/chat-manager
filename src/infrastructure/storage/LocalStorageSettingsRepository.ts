import type { SettingsRepository, Settings } from "../../domain/repositories";

const STORAGE_KEY = "chat-manager-settings";

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
};

export class LocalStorageSettingsRepository implements SettingsRepository {
  async getSettings(): Promise<Settings> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_SETTINGS };
    }
    try {
      const parsed = JSON.parse(stored) as Settings;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  async getItem<T>(key: string): Promise<T | undefined> {
    const settings = await this.getSettings();
    return settings[key] as T | undefined;
  }

  async setItem(key: string, value: unknown): Promise<void> {
    const settings = await this.getSettings();
    (settings as Record<string, unknown>)[key] = value;
    await this.saveSettings(settings);
  }
}
