/* oxlint-disable no-empty-pattern */
/* eslint-disable playwright/no-standalone-expect */
import { expect, type Page } from "@playwright/test";
import { test as base, generateUniqueTagName } from "./utils";
import type { TestFixtures } from "./utils";

const SEARCH_TEST_DOC_TITLE = `e2e_search_${generateUniqueTagName("doc")}`;
const SEARCH_TEST_DOC_CONTENT = `问题: 这是测试问题?\n回答: 这是测试回答。`;

async function createTestDocument(window: Page, title: string): Promise<string> {
  const docId = await window.evaluate(
    async ({ title: docTitle, content }: { title: string; content: string }) => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      return (window as any).electronAPI.db.create(docTitle, content);
    },
    { title, content: SEARCH_TEST_DOC_CONTENT },
  );
  return docId;
}

async function waitForSearchModal(window: Page): Promise<void> {
  await window.waitForSelector(".search-modal", { timeout: 3000 });
}

const searchTest = base.extend<TestFixtures>({});

searchTest.describe("全局搜索功能", () => {
  searchTest.beforeEach(async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 5000 });
    await createTestDocument(window, SEARCH_TEST_DOC_TITLE);
  });

  searchTest("Ctrl+F 唤起搜索面板", async ({ window }) => {
    const modalBefore = window.locator(".search-modal");
    await expect(modalBefore).toBeHidden();

    await window.keyboard.press("Control+f");
    await waitForSearchModal(window);

    const modalAfter = window.locator(".search-modal");
    await expect(modalAfter).toBeVisible();

    const searchInput = window.locator(".search-input__field");
    await expect(searchInput).toBeVisible();
  });

  searchTest("输入搜索词显示结果", async ({ window }) => {
    await window.keyboard.press("Control+f");
    await waitForSearchModal(window);

    const searchInput = window.locator(".search-input__field");
    await searchInput.fill("e2e_search");

    await window.waitForSelector(".search-results", { timeout: 5000 });

    const results = window.locator(".search-results__item");
    await expect(results.first()).toBeVisible();
  });

  searchTest("点击结果跳转", async ({ window }) => {
    await window.keyboard.press("Control+f");
    await waitForSearchModal(window);

    const searchInput = window.locator(".search-input__field");
    await searchInput.fill("e2e_search");

    await window.waitForSelector(".search-results", { timeout: 5000 });

    const firstResult = window.locator(".search-results__item").first();
    await firstResult.click();

    await window.waitForTimeout(300);
    const modalVisible = window.locator(".search-modal");
    await expect(modalVisible).toBeHidden();
  });

  searchTest("Esc 关闭面板", async ({ window }) => {
    await window.keyboard.press("Control+f");
    await waitForSearchModal(window);

    const modalVisibleBefore = window.locator(".search-modal");
    await expect(modalVisibleBefore).toBeVisible();

    await window.keyboard.press("Escape");
    await window.waitForTimeout(300);

    const modalVisibleAfter = window.locator(".search-modal");
    await expect(modalVisibleAfter).toBeHidden();
  });

  searchTest("键盘导航 - 下箭头选中", async ({ window }) => {
    await window.keyboard.press("Control+f");
    await waitForSearchModal(window);

    const searchInput = window.locator(".search-input__field");
    await searchInput.fill("e2e_search");

    await window.waitForSelector(".search-results", { timeout: 5000 });

    await window.keyboard.press("ArrowDown");
    await window.waitForTimeout(100);

    const selectedItem = window.locator(".search-results__item--selected");
    await expect(selectedItem).toBeVisible();
  });

  searchTest("键盘导航 - 上箭头回退", async ({ window }) => {
    await window.keyboard.press("Control+f");
    await waitForSearchModal(window);

    const searchInput = window.locator(".search-input__field");
    await searchInput.fill("e2e_search");

    await window.waitForSelector(".search-results", { timeout: 5000 });

    await window.keyboard.press("ArrowDown");
    await window.waitForTimeout(100);
    await window.keyboard.press("ArrowUp");
    await window.waitForTimeout(100);

    const selectedItem = window.locator(".search-results__item--selected");
    await expect(selectedItem).toBeVisible();
  });

  searchTest("Enter 键确认选择", async ({ window }) => {
    await window.keyboard.press("Control+f");
    await waitForSearchModal(window);

    const searchInput = window.locator(".search-input__field");
    await searchInput.fill("e2e_search");

    await window.waitForSelector(".search-results", { timeout: 5000 });

    await window.keyboard.press("ArrowDown");
    await window.waitForTimeout(100);
    await window.keyboard.press("Enter");
    await window.waitForTimeout(300);

    const modalVisible = window.locator(".search-modal");
    await expect(modalVisible).toBeHidden();
  });
});
