import { expect } from "@playwright/test";
import {
  test,
  generateUniqueDocTitle,
  createDocumentWithAnswer,
  clickFirstDocument,
  doubleClickAnswerToEdit,
} from "./utils";

test.describe("回答编辑保存后重新打开", () => {
  test("修改回答保存后，重新双击打开显示最新内容", async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 2000 });

    // 创建测试文档
    const title = generateUniqueDocTitle("edit_save");
    await createDocumentWithAnswer(window, title);
    await clickFirstDocument(window);

    // 第一次编辑：修改内容
    await doubleClickAnswerToEdit(window);

    const editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    await expect(editor).toHaveClass(/cm-focused/);

    // 清空原有内容并输入新内容
    await window.keyboard.press("Control+a");
    const newContent = "这是修改后的内容_" + Date.now();
    await window.keyboard.type(newContent);

    // 点击保存
    const saveBtn = window.locator(".btn-save");
    await saveBtn.click();

    // 等待编辑器关闭
    await window.waitForSelector(".fullscreen-edit-overlay", {
      state: "detached",
      timeout: 2000,
    });

    // 验证页面上显示的是新内容
    const answerBubble = window.locator(".answer-bubble__content").first();
    await expect(answerBubble).toContainText(newContent, { timeout: 2000 });

    // 重新双击打开编辑器
    await doubleClickAnswerToEdit(window);

    const editorReopened = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editorReopened).toBeVisible({ timeout: 2000 });

    // 验证编辑器中显示的是最新保存的内容
    const editorContent = await editorReopened
      .locator(".cm-content")
      .textContent();

    expect(editorContent).toContain(newContent);

    // 关闭编辑器
    const cancelBtn = window.locator(".btn-cancel");
    await cancelBtn.click();

    await window.waitForSelector(".fullscreen-edit-overlay", {
      state: "detached",
      timeout: 2000,
    });
  });

  test("多次编辑保存后，每次打开都显示最新内容", async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 2000 });

    // 创建测试文档
    const title = generateUniqueDocTitle("multi_edit");
    await createDocumentWithAnswer(window, title);
    await clickFirstDocument(window);

    // 第一次编辑
    await doubleClickAnswerToEdit(window);
    let editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    await expect(editor).toHaveClass(/cm-focused/);

    await window.keyboard.press("Control+a");
    const firstEdit = "第一次编辑内容_" + Date.now();
    await window.keyboard.type(firstEdit);

    await window.locator(".btn-save").click();
    await window.waitForSelector(".fullscreen-edit-overlay", {
      state: "detached",
      timeout: 2000,
    });

    // 第二次编辑
    await doubleClickAnswerToEdit(window);
    editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });
    await editor.click();
    await expect(editor).toHaveClass(/cm-focused/);

    // 验证显示的是第一次编辑的内容
    let editorContent = await editor.locator(".cm-content").textContent();
    expect(editorContent).toContain(firstEdit);

    // 再次修改
    await window.keyboard.press("Control+a");
    const secondEdit = "第二次编辑内容_" + Date.now();
    await window.keyboard.type(secondEdit);

    await window.locator(".btn-save").click();
    await window.waitForSelector(".fullscreen-edit-overlay", {
      state: "detached",
      timeout: 2000,
    });

    // 第三次打开验证
    await doubleClickAnswerToEdit(window);
    editor = window.locator(".fullscreen-edit-editor .cm-editor");
    await expect(editor).toBeVisible({ timeout: 2000 });

    editorContent = await editor.locator(".cm-content").textContent();
    expect(editorContent).toContain(secondEdit);
    expect(editorContent).not.toContain(firstEdit);

    // 关闭编辑器
    await window.locator(".btn-cancel").click();
    await window.waitForSelector(".fullscreen-edit-overlay", {
      state: "detached",
      timeout: 2000,
    });
  });
});
