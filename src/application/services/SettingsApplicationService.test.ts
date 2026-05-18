import { describe, it, expect, beforeEach } from "vitest";
import { SettingsApplicationService } from "./SettingsApplicationService";
import { InMemorySettingsRepository } from "../../infrastructure/storage/InMemorySettingsRepository";
import type { SettingsChangedEvent } from "../../domain/events";
import { SimpleEventBus } from "../../domain/events";

describe("SettingsApplicationService", () => {
  let service: SettingsApplicationService;
  let eventBus: SimpleEventBus;

  beforeEach(() => {
    eventBus = new SimpleEventBus();
    const repo = new InMemorySettingsRepository();
    service = new SettingsApplicationService(repo, eventBus);
  });

  it("should load default settings", async () => {
    const settings = await service.loadSettings();

    expect(settings.darkMode).toBe(false);
  });

  it("should toggle dark mode", async () => {
    const result = await service.toggleTheme();

    expect(result).toBe(true);

    const settings = await service.loadSettings();
    expect(settings.darkMode).toBe(true);
  });

  it("should toggle dark mode back", async () => {
    await service.toggleTheme();
    const result = await service.toggleTheme();

    expect(result).toBe(false);
  });

  it("should set dark mode explicitly", async () => {
    await service.setDarkMode(true);

    const settings = await service.loadSettings();
    expect(settings.darkMode).toBe(true);
  });

  it("should emit ThemeToggledEvent when toggling", async () => {
    let firedDarkMode: boolean | undefined;
    eventBus.on("ThemeToggled", (event) => {
      firedDarkMode = (event as unknown as { isDarkMode: boolean }).isDarkMode;
    });

    await service.toggleTheme();

    expect(firedDarkMode).toBe(true);
  });

  it("should update a setting", async () => {
    await service.updateSetting("darkMode", true);

    const value = await service.getSetting<boolean>("darkMode");
    expect(value).toBe(true);
  });

  it("should emit SettingsChangedEvent when updating", async () => {
    let firedKey: string | undefined;
    eventBus.on("SettingsChanged", (event: SettingsChangedEvent) => {
      firedKey = event.key;
    });

    await service.updateSetting("language", "zh-CN");

    expect(firedKey).toBe("language");
  });

  it("should return undefined for non-existent setting", async () => {
    const value = await service.getSetting("non-existent");

    expect(value).toBeUndefined();
  });
});
