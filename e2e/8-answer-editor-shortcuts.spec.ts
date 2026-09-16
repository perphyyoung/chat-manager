import { expect, type Page } from "@playwright/test";
import {
  test,
  generateUniqueDocTitle,
  createDocumentWithAnswer,
  clickFirstDocument,
  rightClickAnswerToEdit,
} from "./utils";

// CodeMirror 每行是独立 .cm-line div，textContent 拼接不含换行，故按行断言
const readLines = (window: Page) =>
  window.evaluate(() =>
    Array.from(document.querySelectorAll(".fullscreen-edit-editor .cm-line")).map(
      (el) => el.textContent,
    ),
  );

test.describe("编辑回答快捷键", () => {
  test.beforeEach(async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 2000 });
    const title = generateUniqueDocTitle("shortcut");
    await createDocumentWithAnswer(window, title);
    await clickFirstDocument(window);
    await rightClickAnswerToEdit(window);
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

  test("Tab 缩进当前行", async ({ window }) => {
    const editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    await expect(editor).toHaveClass(/cm-focused/);

    // 清空初始内容后输入
    await window.keyboard.press("Control+a");
    await window.keyboard.type("tabtest");

    // 光标移到行首后按 Tab，整行前插入缩进（indentUnit 为 2 空格）
    await window.keyboard.press("Home");
    await window.keyboard.press("Tab");

    const lines = await readLines(window);
    expect(lines[0]).toMatch(/^ {2}tabtest$/);
  });

  test("Ctrl+D 删除当前行", async ({ window }) => {
    const editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    await expect(editor).toHaveClass(/cm-focused/);

    // 清空初始内容后输入三行
    await window.keyboard.press("Control+a");
    await window.keyboard.type("line1");
    await window.keyboard.press("Enter");
    await window.keyboard.type("line2");
    await window.keyboard.press("Enter");
    await window.keyboard.type("line3");

    // 光标：Home 到 line3 行首，ArrowUp 到 line2，Ctrl+D 删除 line2
    await window.keyboard.press("Home");
    await window.keyboard.press("ArrowUp");
    await window.keyboard.press("Control+d");

    expect(await readLines(window)).toEqual(["line1", "line3"]);
  });
});
