/* oxlint-disable no-empty-pattern */
import type { Page, ElectronApplication } from "@playwright/test";
import { test as base, expect } from "@playwright/test";
import path, { join } from "path";
import { rm } from "node:fs/promises";
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

// Test Fixtures 类型（test-scoped）
export type TestFixtures = {
  electronApp: { app: ElectronApplication; needsReset: boolean };
  window: Page;
};

// Worker-scoped Fixtures 类型：持有按文件复用的实例池
export type WorkerFixtures = {
  _appInstancePool: {
    acquire(file: string): Promise<{ app: ElectronApplication; needsReset: boolean }>;
  };
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
export async function createDocumentWithAnswer(page: Page, title: string): Promise<string> {
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

    await win.electronAPI.document.saveDocument({
      id,
      title,
      createdAt,
      updatedAt,
    });

    if (questions.length > 0) {
      await win.electronAPI.question.saveAllQuestions(
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
 * 创建带自定义回答内容(可多行)的测试文档，用于正则搜索的固定 seed；
 * 问题文本使用纯中文，避免数字/特殊符号干扰正则断言
 * @param page Playwright Page 对象
 * @param title 文档标题
 * @param answerContent 回答内容（供正则 seed）
 * @returns 创建的文档 ID
 */
export async function createDocumentWithAnswerContent(
  page: Page,
  title: string,
  answerContent: string,
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
        text: "正则测试题目",
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    answers: [
      {
        id: answerId,
        questionId: questionId,
        content: answerContent,
        createdAt: now,
        updatedAt: now,
      },
    ],
    tags: [],
  };

  await page.evaluate(async (doc: DocumentDTO) => {
    const win = window as unknown as WindowWithElectronAPI;
    const { id, title, createdAt, updatedAt, questions, answers } = doc;

    await win.electronAPI.document.saveDocument({
      id,
      title,
      createdAt,
      updatedAt,
    });

    if (questions.length > 0) {
      await win.electronAPI.question.saveAllQuestions(
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
      return win.electronAPI.document.findAllDocuments();
    });

    // 筛选出 e2e 开头的文档
    const e2eDocs = allDocs.filter((doc) => doc.title.startsWith("e2e"));

    // 永久删除这些文档
    for (const doc of e2eDocs) {
      try {
        await page.evaluate(async (docId: string) => {
          const win = window as unknown as WindowWithElectronAPI;
          await win.electronAPI.document.deleteDocument(docId);
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
export async function clickDocumentByTitle(page: Page, title: string): Promise<void> {
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
  const fab = page.locator(".question-list > .add-fab");
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
  await page.waitForSelector(".question-list .recycle-bin-btn", { timeout: 2000 });
}

/**
 * 创建带 Electron App 和自动清理功能的 test 对象
 * 使用方式: import { test } from './utils'
 *
 * 文件级实例隔离（参考 playground 经验）：
 * 每个测试文件使用独立的数据目录 temp/e2e/{worker}-{seq}，文件内复用同一实例，
 * 切换文件时关闭旧实例并删除其数据目录，因此无需清理 e2e 数据。
 * 多 worker 下每个 worker 各自持有一组实例，实现并发。
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // worker 级实例池：按文件持有当前实例，切文件时关旧起新
  _appInstancePool: [
    async ({}, use, workerInfo) => {
      // 用对象包一层，避免闭包内赋值被 TS 窄化为 never（参考经验第五节）
      const state: {
        current: { file: string; app: ElectronApplication; dataDir: string } | null;
      } = { current: null };
      let seq = 0;

      const { _electron: electron } = await import("@playwright/test");

      async function acquireInstance(
        file: string,
      ): Promise<{ app: ElectronApplication; needsReset: boolean }> {
        if (state.current?.file === file) {
          // 命中已有实例 = 本文件非首个用例：文件级共享实例，用例间需 reload 复位
          // （首个用例必然走到下方新建分支，不会进入这里）
          return { app: state.current.app, needsReset: true };
        }
        if (state.current) {
          await state.current.app.close();
          await rm(state.current.dataDir, { recursive: true, force: true });
        }

        // 目录名与 E2E_INSTANCE 必须一致，否则删除时对不上真实数据目录
        const instanceName = `w${workerInfo.workerIndex}-${seq++}`;
        const dataDir = join(process.cwd(), "temp", "e2e", instanceName);
        const electronApp = await electron.launch({
          args: [join(process.cwd(), "out/main/index.js")],
          cwd: process.cwd(),
          env: { ...process.env, E2E: "1", E2E_INSTANCE: instanceName },
        });
        state.current = { file, app: electronApp, dataDir };
        return { app: electronApp, needsReset: false };
      }

      await use({ acquire: acquireInstance });

      // worker teardown 兜底：关闭并删除当前实例的数据目录
      if (state.current) {
        await state.current.app.close().catch(() => {});
        await rm(state.current.dataDir, { recursive: true, force: true }).catch(() => {});
      }
    },
    { scope: "worker" },
  ],

  // Electron App fixture - 按测试文件获取实例，文件内复用
  electronApp: [
    async ({ _appInstancePool }, use, testInfo) => {
      const { app, needsReset } = await _appInstancePool.acquire(testInfo.file);
      await use({ app, needsReset });
    },
    // 启动耗时不计入用例；同一文件所有用例共享该实例
    { scope: "test", timeout: 30_000 },
  ],

  // Window fixture - 从 electronApp 获取主窗口
  // 文件级共享实例下：每个文件首个用例面对全新实例无残留，跳过 reload；
  // 后续用例 reload 复位，清掉上一用例残留的弹窗/覆盖层（如 tag-selector-overlay）
  window: [
    async ({ electronApp }, use) => {
      const { app, needsReset } = electronApp;
      const window = await app.firstWindow();
      await window.waitForLoadState("domcontentloaded");
      if (needsReset) {
        await window.reload({ timeout: 8_000 });
        await window.waitForSelector(".document-list", { timeout: 2_000 });
      }
      await use(window);
    },
    { auto: true, timeout: 30_000 },
  ],
});
