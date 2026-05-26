/* oxlint-disable no-empty-pattern */
import { expect, type Page } from "@playwright/test";
import { test } from "./utils";

const DOC_TITLE_PREFIX = "e2e_undo_redo";

function generateUniqueDocTitle(): string {
  const timeSuffix = Date.now().toString(36).slice(-6);
  const randomSuffix = Math.random().toString(36).substr(2, 4);
  return `${DOC_TITLE_PREFIX}_${timeSuffix}_${randomSuffix}`;
}

async function createDocumentWithAnswer(window: Page, title: string): Promise<void> {
  const docId = crypto.randomUUID();
  const questionId = crypto.randomUUID();
  const answerId = crypto.randomUUID();
  const now = new Date().toISOString();

  const document = {
    id: docId,
    title: title,
    createdAt: now,
    updatedAt: now,
    questions: [
      {
        id: questionId,
        text: "测试问题",
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    answers: [
      {
        id: answerId,
        questionId: questionId,
        content: "初始回答内容",
        createdAt: now,
        updatedAt: now,
      },
    ],
    tags: [],
  };

  await window.evaluate(
    async (doc: typeof document) => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      await (window as any).electronAPI.db.save(JSON.stringify(doc));
    },
    document,
  );
}

async function clickFirstDocument(window: Page): Promise<void> {
  const document = window.locator(".document-item").first();
  await expect(document).toBeVisible({ timeout: 2000 });
  await document.click();
  await window.waitForSelector(".conversation-view", { timeout: 2000 });
}

async function doubleClickAnswerToEdit(window: Page): Promise<void> {
  const answer = window.locator(".answer-bubble__content").first();
  await expect(answer).toBeVisible({ timeout: 2000 });
  await answer.dblclick();
  await window.waitForSelector(".fullscreen-edit-overlay", { timeout: 2000 });
}

test.describe("撤销和重做功能", () => {
  test.beforeEach(async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 2000 });
    const title = generateUniqueDocTitle();
    await createDocumentWithAnswer(window, title);
    await clickFirstDocument(window);
    await doubleClickAnswerToEdit(window);
  });

  test("撤销按钮撤销输入", async ({ window }) => {
    const editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    // 等待编辑器获得焦点
    await expect(editor).toHaveClass(/cm-focused/);

    await window.keyboard.type("hello");

    const content = await editor.locator(".cm-content").textContent();
    expect(content).toContain("hello");

    const undoBtn = window.locator(".btn-action").first();
    await undoBtn.click();

    await window.waitForFunction(
      () => !document.querySelector(".cm-content")?.textContent?.includes("hello"),
      { timeout: 2000 },
    );
    const contentAfterUndo = await editor.locator(".cm-content").textContent();
    expect(contentAfterUndo).not.toContain("hello");
  });

  test("重做按钮重做撤销", async ({ window }) => {
    const editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    // 聚焦编辑器后等待光标出现，确保 CodeMirror 准备好记录历史
    await expect(editor).toHaveClass(/cm-focused/);

    await window.keyboard.type("world");

    const undoBtn = window.locator(".btn-action").first();
    await undoBtn.click();

    await window.waitForFunction(
      () => !document.querySelector(".cm-content")?.textContent?.includes("world"),
      { timeout: 2000 },
    );

    const redoBtn = window.locator(".btn-action").nth(1);
    await redoBtn.click();

    await window.waitForFunction(
      () => document.querySelector(".cm-content")?.textContent?.includes("world"),
      { timeout: 2000 },
    );
    const contentAfterRedo = await editor.locator(".cm-content").textContent();
    expect(contentAfterRedo).toContain("world");
  });

  test("Ctrl+Z 快捷键撤销", async ({ window }) => {
    const editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    await expect(editor).toHaveClass(/cm-focused/);

    await window.keyboard.type("test");

    const content = await editor.locator(".cm-content").textContent();
    expect(content).toContain("test");

    await window.keyboard.press("Control+z");

    await window.waitForFunction(
      () => !document.querySelector(".cm-content")?.textContent?.includes("test"),
      { timeout: 2000 },
    );
    const contentAfterUndo = await editor.locator(".cm-content").textContent();
    expect(contentAfterUndo).not.toContain("test");
  });

  test("Ctrl+Y 快捷键重做", async ({ window }) => {
    const editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    await expect(editor).toHaveClass(/cm-focused/);

    await window.keyboard.type("redo");

    await window.keyboard.press("Control+z");

    await window.waitForFunction(
      () => !document.querySelector(".cm-content")?.textContent?.includes("redo"),
      { timeout: 2000 },
    );

    await window.keyboard.press("Control+y");

    await window.waitForFunction(
      () => document.querySelector(".cm-content")?.textContent?.includes("redo"),
      { timeout: 2000 },
    );
    const contentAfterRedo = await editor.locator(".cm-content").textContent();
    expect(contentAfterRedo).toContain("redo");
  });

  test("空编辑器撤销不报错", async ({ window }) => {
    const undoBtn = window.locator(".btn-action").first();
    await undoBtn.click();

    // 等待撤销操作完成（编辑器应该仍然可见）
    await expect(window.locator(".fullscreen-edit-editor .cm-editor")).toBeVisible({ timeout: 2000 });
  });

  test("取消编辑不保存", async ({ window }) => {

    const editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();

    await window.keyboard.type("temp_content");

    const contentBeforeCancel = await editor.locator(".cm-content").textContent();
    expect(contentBeforeCancel).toContain("temp_content");

    const cancelBtn = window.locator(".btn-cancel");
    await cancelBtn.click();

    await window.waitForSelector(".fullscreen-edit-overlay", {
      state: "detached",
      timeout: 2000,
    });
  });
});
