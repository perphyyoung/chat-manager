import type { SettingsRepository, Settings } from "../../domain/repositories";

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
};

export class InMemorySettingsRepository implements SettingsRepository {
  private settings: Settings = { ...DEFAULT_SETTINGS };

  async getSettings(): Promise<Settings> {
    return { ...this.settings };
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.settings = { ...settings };
  }

  async getItem<T>(key: string): Promise<T | undefined> {
    return this.settings[key] as T | undefined;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.settings[key] = value;
  }

  clear(): void {
    this.settings = { ...DEFAULT_SETTINGS };
  }
}
