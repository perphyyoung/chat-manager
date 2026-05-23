/* oxlint-disable no-empty-pattern */
import type { Page, ElectronApplication } from "@playwright/test";
import { test as base } from "@playwright/test";
import { join } from "path";

/**
 * E2E 测试辅助函数和 Fixture
 */

// Tag 类型定义
export interface TagDTO {
  id: string;
  name: string;
  createdAt: string;
}

// Electron Window 类型，包含 electronAPI
export type ElectronWindow = Page & {
  evaluate: <T, R>(fn: (arg: T) => R, arg: T) => Promise<R>;
};

// Test Fixtures 类型
export type TestFixtures = {
  electronApp: ElectronApplication;
  window: Page;
};

/**
 * 写入日志到 cm.log
 * @param page Playwright Page 对象
 * @param
 level 日志级别: info | error | debug
 * @param message 日志消息
 */
export async function logToFile(
  page: Page,
  level: "info" | "error" | "debug",
  message: string,
): Promise<void> {
  await page.evaluate(
    ({ lvl, msg }) => {
      window.electronAPI.logToFile(lvl, `[E2E-TEST] ${msg}`);
    },
    { lvl: level, msg: message },
  );
}

/**
 * 生成唯一标签名，以 e2e 开头便于识别和清理
 * @param prefix 标签前缀
 * @returns 生成的标签名
 */
export function generateUniqueTagName(prefix: string): string {
  const timeSuffix = Date.now().toString(36).slice(-6);
  const randomSuffix = Math.random().toString(36).substr(2, 2);
  return `e2e_${prefix}_${timeSuffix}_${randomSuffix}`;
}

/**
 * 清理所有 e2e 开头的标签
 * @param window Electron Window 对象
 */
export async function cleanupE2ETags(window: ElectronWindow): Promise<void> {
  try {
    // 获取所有标签
    const allTags = await window.evaluate(async (_args: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await (window as any).electronAPI.tag?.findAll()) || [];
    }, {});

    // 筛选出 e2e 开头的标签
    const e2eTags = (allTags as TagDTO[]).filter((tag) =>
      tag.name.startsWith("e2e_"),
    );

    // 删除这些标签
    for (const tag of e2eTags) {
      try {
        await window.evaluate(
          async ({ id }: { id: string }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (window as any).electronAPI.tag?.delete(id);
          },
          { id: tag.id },
        );
      } catch (e) {
        await logToFile(window, "error", `清理标签失败: ${tag.name} - ${e}`);
      }
    }
  } catch (e) {
    await logToFile(window, "error", `清理过程出错: ${e}`);
  }
}

/**
 * 创建带 Electron App 和自动清理功能的 test 对象
 * 使用方式: import { test } from './utils'
 */
export const test = base.extend<TestFixtures>({
  // Electron App fixture - 每个测试前启动，测试后关闭
  electronApp: [
    async ({}, use) => {
      const projectRoot = process.cwd();
      const { _electron: electron } = await import("@playwright/test");

      const electronApp = await electron.launch({
        args: [join(projectRoot, "out/main/index.js")],
        cwd: projectRoot,
      });

      // 提供给测试使用
      await use(electronApp);

      // 测试结束后清理 e2e 标签
      try {
        const window = await electronApp.firstWindow();
        await window.waitForLoadState("domcontentloaded");
        await window.waitForSelector(".document-list", { timeout: 2000 });
        await cleanupE2ETags(window as ElectronWindow);
      } catch (e) {
        console.log("[CLEANUP-ERROR]", e);
      }

      // 关闭应用
      await electronApp.close();
    },
    { auto: true },
  ],

  // Window fixture - 从 electronApp 获取主窗口
  window: [
    async ({ electronApp }, use) => {
      const window = await electronApp.firstWindow();
      await window.waitForLoadState("domcontentloaded");
      await use(window);
    },
    { auto: true },
  ],
});
