import type { SettingsRepository, Settings } from "../../domain/repositories";

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
};

export class LocalStorageSettingsRepository implements SettingsRepository {
  private readonly STORAGE_KEY = "settings";

  async getSettings(): Promise<Settings> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      return { ...DEFAULT_SETTINGS };
    }
    try {
      const parsed = JSON.parse(data) as Settings;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  async getItem<T>(key: string): Promise<T | undefined> {
    const settings = await this.getSettings();
    return settings[key] as T | undefined;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;
    await this.saveSettings(settings);
  }
}
