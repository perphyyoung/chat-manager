import { expect } from "@playwright/test";
import { test } from "./utils";

// 设置菜单：走 file scope 共享实例（自动隔离 userData、并发安全），
// 第一用例不 reload，第二用例由 window fixture reload 复位。
test("settings menu opens settings modal", async ({ window, electronApp }) => {
  // 等 .document-list 出现（App onMounted 已执行）后再点菜单。
  await window.waitForSelector(".document-list", { timeout: 2000 });

  await electronApp.app.evaluate(async ({ app, BrowserWindow }) => {
    // 先聚焦本进程窗口，再点击菜单：并发 e2e 多窗口争夺系统焦点时，
    // 若不主动 focus，菜单回调可能拿不到本窗口，open-settings 消息发不出去。
    BrowserWindow.getAllWindows()[0]?.focus();
    const menu = app.applicationMenu;
    const fileMenu = menu?.items.find((item) => item.label === "File");
    const settingsItem = fileMenu?.submenu?.items.find((item) => item.label === "设置");
    if (settingsItem) {
      settingsItem.click();
    }
  });

  const settingsModal = window.locator(".modal-content");
  await expect(settingsModal).toBeVisible({ timeout: 2000 });

  const modalText = await settingsModal.textContent();
  expect(modalText).toContain("设置");
  expect(modalText).toContain("深色主题");
});

test("settings shortcut is configured correctly", async ({ electronApp }) => {
  // 验证菜单项的快捷键配置
  const accelerator = await electronApp.app.evaluate(async ({ app }) => {
    const menu = app.applicationMenu;
    const fileMenu = menu?.items.find((item) => item.label === "File");
    const settingsItem = fileMenu?.submenu?.items.find((item) => item.label === "设置");
    return settingsItem?.accelerator || null;
  });

  // 验证快捷键已配置（CmdOrCtrl+, 在 Windows 上显示为 Ctrl+,）
  expect(accelerator).toBeTruthy();
  expect(accelerator).toMatch(/CmdOrCtrl\+.|CommandOrControl\+./);
});
