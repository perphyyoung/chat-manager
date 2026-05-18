import type { SettingsRepository, Settings } from "../../domain/repositories";
import type { EventBus } from "../../domain/events/EventBus";
import {
  ThemeToggledEvent,
  SettingsChangedEvent,
} from "../../domain/events/SettingsEvents";

export class SettingsApplicationService {
  constructor(
    private settingsRepo: SettingsRepository,
    private eventBus: EventBus,
  ) {}

  async loadSettings(): Promise<Settings> {
    return this.settingsRepo.getSettings();
  }

  async toggleTheme(): Promise<boolean> {
    const settings = await this.settingsRepo.getSettings();
    const newDarkMode = !settings.darkMode;

    await this.settingsRepo.setItem("darkMode", newDarkMode);
    this.eventBus.emit(new ThemeToggledEvent(newDarkMode));

    return newDarkMode;
  }

  async setDarkMode(isDark: boolean): Promise<void> {
    await this.settingsRepo.setItem("darkMode", isDark);
    this.eventBus.emit(new ThemeToggledEvent(isDark));
  }

  async updateSetting<T>(key: string, value: T): Promise<void> {
    await this.settingsRepo.setItem(key, value);
    this.eventBus.emit(new SettingsChangedEvent(key, value));
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    return this.settingsRepo.getItem<T>(key);
  }
}
