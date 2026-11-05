export interface Settings {
  darkMode: boolean;
  // 回答默认显示的最大行数；0 表示不限制
  answerMaxLines: number;
  [key: string]: unknown;
}

export interface SettingsRepository {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  getItem<T>(key: string): Promise<T | undefined>;
  setItem<T>(key: string, value: T): Promise<void>;
}
