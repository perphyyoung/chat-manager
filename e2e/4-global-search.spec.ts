import { expect } from "@playwright/test";
import { test, generateUniqueDocTitle, openSearch, createDocumentWithAnswer } from "./utils";

test.describe("全局搜索功能", () => {
  test.beforeEach(async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 2000 });
    // file scope 下每个测试共享库，标题必须唯一，避免重复创建同名文档累积
    const title = generateUniqueDocTitle("search");
    await createDocumentWithAnswer(window, title);
    await window.waitForSelector(".document-list", { timeout: 2000 });
  });

  test("Ctrl+F 唤起搜索面板", async ({ window }) => {
    const modalBefore = window.locator(".search-modal");
    await expect(modalBefore).toBeHidden();

    await window.keyboard.press("Control+f");

    const searchModal = window.locator(".search-modal");
    await expect(searchModal).toBeVisible({ timeout: 2000 });

    const searchInput = window.locator(".search-input__field");
    await expect(searchInput).toBeVisible();
  });

  test("输入搜索词显示结果", async ({ window }) => {
    await openSearch(window);

    const searchInput = window.locator(".search-input__field");
    await expect(searchInput).toBeVisible({ timeout: 2000 });
    await searchInput.fill("e2e");

    await expect(window.locator(".search-results")).toBeVisible({
      timeout: 2000,
    });
  });

  test("点击结果跳转", async ({ window }) => {
    await openSearch(window);

    const searchInput = window.locator(".search-input__field");
    await expect(searchInput).toBeVisible({ timeout: 2000 });
    await searchInput.fill("e2e");

    await window.waitForSelector(".search-results", { timeout: 2000 });
    const firstResult = window.locator(".search-results__item").first();
    await expect(firstResult).toBeVisible({ timeout: 2000 });
    await firstResult.click();

    await expect(window.locator(".search-modal")).toBeHidden({ timeout: 2000 });
  });

  test("右上角 x 关闭面板", async ({ window }) => {
    await openSearch(window);

    await expect(window.locator(".search-modal")).toBeVisible({
      timeout: 2000,
    });

    await window.locator(".search-modal__close").click();

    await expect(window.locator(".search-modal")).toBeHidden({ timeout: 2000 });
  });

  test("键盘导航 - 下箭头选中", async ({ window }) => {
    await openSearch(window);

    const searchInput = window.locator(".search-input__field");
    await expect(searchInput).toBeVisible({ timeout: 2000 });
    await searchInput.fill("e2e");

    await window.waitForSelector(".search-results", { timeout: 2000 });
    await window.keyboard.press("ArrowDown");

    await expect(window.locator(".search-results__item--selected")).toBeVisible({ timeout: 2000 });
  });

  test("键盘导航 - 上箭头回退", async ({ window }) => {
    await openSearch(window);

    const searchInput = window.locator(".search-input__field");
    await expect(searchInput).toBeVisible({ timeout: 2000 });
    await searchInput.fill("e2e");

    await window.waitForSelector(".search-results", { timeout: 2000 });
    await window.keyboard.press("ArrowDown");
    await window.keyboard.press("ArrowUp");

    await expect(window.locator(".search-results__item--selected")).toBeVisible({ timeout: 2000 });
  });

  test("Enter 键确认选择", async ({ window }) => {
    await openSearch(window);

    const searchInput = window.locator(".search-input__field");
    await expect(searchInput).toBeVisible({ timeout: 2000 });
    await searchInput.fill("e2e");

    await window.waitForSelector(".search-results", { timeout: 2000 });
    await window.keyboard.press("ArrowDown");
    await window.keyboard.press("Enter");

    await expect(window.locator(".search-modal")).toBeHidden({ timeout: 2000 });
  });
});
