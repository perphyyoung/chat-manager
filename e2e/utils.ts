/* oxlint-disable no-empty-pattern */
import type { Page, ElectronApplication } from "@playwright/test";
import { test as base, expect } from "@playwright/test";
import path, { join } from "path";
import type { ElectronAPI } from "../src/types/api";
import type { DocumentDTO } from "../src/types/dto";
import log from "electron-log";

log.transports.file.resolvePathFn = () => path.join(process.cwd(), "cm.log");
log.transports.file.level = "debug";
log.transports.console.level = "warn";
export { log };

// Electron Window 类型，包含 electronAPI
export type ElectronWindow = Page & {
  evaluate: <T, R>(fn: (arg: T) => R, arg: T) => Promise<R>;
};

// Test Fixtures 类型
export type TestFixtures = {
  electronApp: ElectronApplication;
  window: Page;
};

// 用于类型安全的 window 访问
type WindowWithElectronAPI = Window & {
  electronAPI: ElectronAPI;
};

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
 * 生成e2e开头的唯一文档标题
 * @param label 文档前缀
 * @returns 生成的文档标题
 */
export function generateUniqueDocTitle(label: string): string {
  const timeSuffix = Date.now().toString(36).slice(-6);
  const randomSuffix = Math.random().toString(36).substr(2, 4);
  return `e2e_${label}_${timeSuffix}_${randomSuffix}`;
}

/**
 * 创建带问题和答案的测试文档
 * @param page Playwright Page 对象
 * @param title 文档标题
 * @returns 创建的文档 ID
 */
export async function createDocumentWithAnswer(
  page: Page,
  title: string,
): Promise<string> {
  const docId = crypto.randomUUID();
  const questionId = crypto.randomUUID();
  const answerId = crypto.randomUUID();
  const now = new Date().toISOString();

  const document: DocumentDTO = {
    id: docId,
    title,
    createdAt: now,
    updatedAt: now,
    questions: [
      {
        id: questionId,
        text: "e2e测试问题",
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    answers: [
      {
        id: answerId,
        questionId: questionId,
        content: "e2e初始回答内容",
        createdAt: now,
        updatedAt: now,
      },
    ],
    tags: [],
  };

  await page.evaluate(async (doc: DocumentDTO) => {
    const win = window as unknown as WindowWithElectronAPI;
    const { id, title, createdAt, updatedAt, questions, answers } = doc;

    await win.electronAPI.db.document.save({ id, title, createdAt, updatedAt });

    if (questions.length > 0) {
      await win.electronAPI.db.questions.save(
        id,
        questions.map((q) => ({
          id: q.id,
          text: q.text,
          order: q.order,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          isDeleted: q.isDeleted === 1,
          deletedAt: q.deletedAt,
        })),
      );
    }

    if (answers.length > 0) {
      await win.electronAPI.answer.saveAllAnswers(
        id,
        answers.map((a) => ({
          id: a.id,
          questionId: a.questionId,
          content: a.content,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        })),
      );
    }
  }, document);

  await page.reload();
  return docId;
}

/**
 * 清理所有 e2e 开头的标签
 * @param page Playwright Page 对象
 */
export async function cleanupE2ETags(page: Page): Promise<void> {
  try {
    const allTags = await page.evaluate(async () => {
      const win = window as unknown as WindowWithElectronAPI;
      return win.electronAPI.tag.findAllTags();
    });

    // 筛选出 e2e 开头的标签
    const e2eTags = allTags.filter((tag) => tag.name.startsWith("e2e"));

    // 删除这些标签
    for (const tag of e2eTags) {
      try {
        await page.evaluate(async (tagId: string) => {
          const win = window as unknown as WindowWithElectronAPI;
          await win.electronAPI.tag.deleteTag(tagId);
        }, tag.id);
      } catch (e) {
        log.error(`清理标签失败: ${tag.name} - ${e}`);
      }
    }
  } catch (e) {
    log.error(`清理标签过程出错: ${e}`);
  }
}

/**
 * 清理所有 e2e 开头的文档（永久删除）
 * @param page Playwright Page 对象
 */
export async function cleanupE2EDocuments(page: Page): Promise<void> {
  try {
    const allDocs = await page.evaluate(async () => {
      const win = window as unknown as WindowWithElectronAPI;
      return win.electronAPI.db.findAll();
    });

    // 筛选出 e2e 开头的文档
    const e2eDocs = allDocs.filter((doc) => doc.title.startsWith("e2e"));

    // 永久删除这些文档
    for (const doc of e2eDocs) {
      try {
        await page.evaluate(async (docId: string) => {
          const win = window as unknown as WindowWithElectronAPI;
          await win.electronAPI.db.document.delete(docId);
        }, doc.id);
      } catch (e) {
        log.error(`清理文档失败: ${doc.title} - ${e}`);
      }
    }
  } catch (e) {
    log.error(`清理文档过程出错: ${e}`);
  }
}

/**
 * 点击第一个文档
 * @param page Playwright Page 对象
 */
export async function clickFirstDocument(page: Page): Promise<void> {
  const document = page.locator(".document-item").first();
  await document.click();
  await page.waitForSelector(".conversation-view", { timeout: 2000 });
}

/**
 * 右键答案进入编辑模式
 * @param page Playwright Page 对象
 */
export async function rightClickAnswerToEdit(page: Page): Promise<void> {
  const answer = page.locator(".answer-bubble__content").first();
  await answer.click({ button: "right" });
  await page.waitForSelector(".context-menu", { timeout: 2000 });
  await page.locator(".context-menu-item", { hasText: "编辑" }).click();
  await page.waitForSelector(".fullscreen-edit-overlay", { timeout: 2000 });
}

/**
 * 打开搜索面板
 * @param page Playwright Page 对象
 */
export async function openSearch(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = window as unknown as WindowWithElectronAPI;
    win.electronAPI.openSearch();
  });
}

/**
 * 点击指定标题的文档
 * @param page Playwright Page 对象
 * @param title 文档标题
 */
export async function clickDocumentByTitle(
  page: Page,
  title: string,
): Promise<void> {
  const document = page.locator(".document-item").filter({ hasText: title });
  await expect(document).toBeVisible({ timeout: 2000 });
  await document.click();
  await page.waitForSelector(".conversation-view", { timeout: 2000 });
}

/**
 * 打开添加问题对话框
 * @param page Playwright Page 对象
 */
export async function openAddDialog(page: Page): Promise<void> {
  const fab = page.locator(".question-list > .fab:not(.fab--recycle)");
  await fab.click();
  await page.waitForSelector(".add-question-model", { timeout: 2000 });
  await page.waitForSelector(".dialog-input", { timeout: 2000 });
}

/**
 * 删除第一个问题
 * @param page Playwright Page 对象
 */
export async function deleteFirstQuestion(page: Page): Promise<void> {
  const firstQuestion = page.locator(".question-item").first();
  await firstQuestion.click({ button: "right" });
  await page.waitForSelector(".context-menu", { timeout: 2000 });
  await page.locator(".context-menu-item--danger").click();
  // 等待回收站按钮出现
  await page.waitForSelector(".fab--recycle", { timeout: 2000 });
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

      // 测试结束后清理 e2e 数据
      try {
        const window = await electronApp.firstWindow();
        await window.waitForLoadState("domcontentloaded");
        await window.waitForSelector(".document-list", { timeout: 2000 });
        await cleanupE2ETags(window);
        await cleanupE2EDocuments(window);
      } catch (e) {
        log.error(`[E2E CLEANUP-ERROR]: ${e}`);
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
