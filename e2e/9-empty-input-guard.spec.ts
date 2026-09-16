import { expect } from "@playwright/test";
import {
  test,
  generateUniqueDocTitle,
  generateUniqueTagName,
  createDocumentWithAnswer,
  clickFirstDocument,
  rightClickAnswerToEdit,
} from "./utils";

test.describe("置空输入防护", () => {
  test.beforeEach(async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 2000 });
    const title = generateUniqueDocTitle("guard");
    await createDocumentWithAnswer(window, title);
    await clickFirstDocument(window);
  });

  test("新建文档标题为空时创建按钮禁用", async ({ window }) => {
    await window.locator(".document-list .add-fab").click();
    await expect(window.locator(".dialog")).toBeVisible({ timeout: 2000 });
    await expect(window.locator(".dialog .btn-primary")).toBeDisabled();
  });

  test("新建标签（筛选区）为空时确定按钮禁用", async ({ window }) => {
    await window.locator(".tag-filter__add-btn").click();
    await window.waitForSelector(".tag-filter__input", { timeout: 2000 });
    await expect(window.locator(".tag-filter__btn-confirm")).toBeDisabled();
  });

  test("新建标签（工具栏）为空时创建按钮禁用", async ({ window }) => {
    await window.locator(".tag-selector__toggle").click();
    await window.waitForSelector(".tag-selector__dropdown", { timeout: 2000 });
    await window.locator(".tag-selector__create-btn").click();
    await window.waitForSelector(".tag-selector__input", { timeout: 2000 });
    await expect(window.locator(".tag-selector__btn-confirm")).toBeDisabled();
  });

  test("编辑文档标题为空时保存按钮禁用", async ({ window }) => {
    const doc = window.locator(".document-item").first();
    await doc.click({ button: "right" });
    await window.waitForSelector(".context-menu", { timeout: 2000 });
    await window.locator(".context-menu-item", { hasText: "编辑标题" }).click();

    const dialog = window.locator(".dialog");
    await expect(dialog).toBeVisible({ timeout: 2000 });
    await dialog.locator('input[type="text"]').clear();

    await expect(dialog.locator(".btn-primary")).toBeDisabled();
  });

  test("编辑文档标题为空按 Enter 提示", async ({ window }) => {
    const doc = window.locator(".document-item").first();
    await doc.click({ button: "right" });
    await window.waitForSelector(".context-menu", { timeout: 2000 });
    await window.locator(".context-menu-item", { hasText: "编辑标题" }).click();

    const dialog = window.locator(".dialog");
    await expect(dialog).toBeVisible({ timeout: 2000 });
    await dialog.locator('input[type="text"]').clear();
    await dialog.locator('input[type="text"]').press("Enter");

    await expect(window.locator(".toast")).toContainText("文档标题不能为空", { timeout: 2000 });
    await expect(dialog).toBeVisible();
  });

  test("编辑问题为空时保存按钮禁用", async ({ window }) => {
    await window.locator(".question-item").first().click({ button: "right" });
    await window.waitForSelector(".context-menu", { timeout: 2000 });
    await window.locator(".context-menu-item", { hasText: "编辑问题" }).click();

    const dialog = window.locator(".dialog");
    await expect(dialog).toBeVisible({ timeout: 2000 });
    await dialog.locator(".dialog-input").clear();

    await expect(dialog.locator(".btn-primary")).toBeDisabled();
  });

  test("编辑标签为空时保存按钮禁用", async ({ window }) => {
    // 先新建一个标签
    const tagName = generateUniqueTagName("empty");
    await window.locator(".tag-filter__add-btn").click();
    await window.waitForSelector(".tag-filter__input", { timeout: 2000 });
    await window.locator(".tag-filter__input").fill(tagName);
    await window.locator(".tag-filter__btn-confirm").click();

    // 右键新标签进入编辑
    const item = window.locator(".tag-filter__item").filter({ hasText: tagName });
    await expect(item).toBeVisible({ timeout: 2000 });
    await item.click({ button: "right" });
    await window.waitForSelector(".context-menu", { timeout: 2000 });
    await window.locator(".context-menu-item", { hasText: "编辑标签" }).click();

    const editInput = window.locator(".tag-filter__pop .tag-filter__input");
    await expect(editInput).toBeVisible({ timeout: 2000 });
    await editInput.clear();

    await expect(window.locator(".tag-filter__pop .tag-filter__btn-confirm")).toBeDisabled();
  });

  test("回答置空后保存按钮禁用", async ({ window }) => {
    await rightClickAnswerToEdit(window);
    const editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    await expect(editor).toHaveClass(/cm-focused/);

    await window.keyboard.press("Control+a");
    await window.keyboard.press("Delete");

    await expect(window.locator(".btn-save")).toBeDisabled();
  });
});
