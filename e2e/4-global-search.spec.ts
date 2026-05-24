/* oxlint-disable no-empty-pattern */
import { expect, type Page } from "@playwright/test";
import { test, generateUniqueTagName } from "./utils";

const SEARCH_TEST_DOC_TITLE = `e2e_${generateUniqueTagName("doc")}`;

async function createTestDocument(window: Page): Promise<void> {
  await window.evaluate(
    async (docTitle: string) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      /* eslint-disable @typescript-eslint/no-explicit-any */
      await (window as any).electronAPI.db.save(JSON.stringify({
        id,
        title: docTitle,
        createdAt: now,
        updatedAt: now,
        questions: [],
        answers: [],
        tags: [],
      }));
    },
    SEARCH_TEST_DOC_TITLE,
  );
}

async function openSearch(window: Page): Promise<void> {
  await window.evaluate(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (window as any).electronAPI.openSearch();
  });
}

test.describe("全局搜索功能", () => {
  test.beforeEach(async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 2000 });
    await createTestDocument(window);
  });

  test("Ctrl+F 唤起搜索面板", async ({ window }) => {
    const modalBefore = window.locator(".search-modal");
    await expect(modalBefore).toBeHidden();

    await openSearch(window);

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

    await expect(window.locator(".search-results")).toBeVisible({ timeout: 2000 });
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

  test("Esc 关闭面板", async ({ window }) => {
    await openSearch(window);

    await expect(window.locator(".search-modal")).toBeVisible({ timeout: 2000 });

    await window.keyboard.press("Escape");

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
