/* eslint-disable playwright/expect-expect -- 断言已封装进 expectHit/expectMiss 等辅助函数 */
import { test, openSearch, createDocumentWithAnswerContent } from "./utils";
import { expect, type Page } from "@playwright/test";

// 正则搜索 e2e：按 SearchModal“常用语法”表格逐条覆盖正例与反例。
//
// 说明：搜索扫全库（含真实历史数据），命中会被 LIMIT 截断，故正例仅断言“有结果”、
// 反例仅断言“空态”。query 构造为保证命中/不命中 seed——seed 首行以 // 开头、
// 末行以 end 结尾，支撑无多行标志时的 ^// 与 end$。
const REGEX_SEED = [
  "// 这是行首注释",
  "TODO: 计划项",
  "TODO 待办项",
  "abc 与 a1c",
  "数字 42 和 7",
  "cat 和 dog",
  "tail ends with end",
].join("\n");

test.describe("正则搜索功能", () => {
  // 固定标题：无大写、无三连以上数字、无特殊符号，避免干扰反例空态
  const SEARCH_TEST_DOC_TITLE = "e2e_regex_seed_doc";

  test.beforeEach(async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 2000 });
    await createDocumentWithAnswerContent(window, SEARCH_TEST_DOC_TITLE, REGEX_SEED);
    await window.waitForSelector(".document-list", { timeout: 2000 });
  });

  // 打开搜索面板并切换到正则模式
  async function enterRegexMode(window: Page): Promise<void> {
    await openSearch(window);
    await window.locator(".search-input__toggle").click();
    await expect(window.locator(".search-input__field")).toBeVisible({ timeout: 2000 });
  }

  // 正例：query 能命中（seed 保证至少命中一条）→ 结果面板出现
  async function expectHit(window: Page, query: string): Promise<void> {
    await window.locator(".search-input__field").fill(query);
    await expect(window.locator(".search-results")).toBeVisible({ timeout: 2000 });
  }

  // 反例：query 不可能命中 → 空态
  async function expectMiss(window: Page, query: string): Promise<void> {
    await window.locator(".search-input__field").fill(query);
    await expect(window.locator(".search-modal__empty")).toBeVisible({ timeout: 2000 });
  }

  test("^ 行首：行首 // 命中，行首锚定 #9zXq 排除", async ({ window }) => {
    await enterRegexMode(window);
    await expectHit(window, "^//");
    await expectMiss(window, "^#9zXq");
  });

  test("$ 行尾：end$ 命中，行尾 // 排除", async ({ window }) => {
    await enterRegexMode(window);
    await expectHit(window, "end$");
    await expectMiss(window, "//$");
  });

  test(". 任意单字符：a.c 命中，qx9.zz 排除", async ({ window }) => {
    await enterRegexMode(window);
    await expectHit(window, "a.c");
    await expectMiss(window, "qx9.zz");
  });

  test("* 前项 0 或多次：ab* 命中，q9Zx*W6 排除", async ({ window }) => {
    await enterRegexMode(window);
    await expectHit(window, "ab*");
    await expectMiss(window, "q9Zx*W6");
  });

  test("+ 前项 1 或多次：\\d+ 命中，\\d{9,} 排除", async ({ window }) => {
    await enterRegexMode(window);
    await expectHit(window, "\\d+");
    await expectMiss(window, "\\d{9,}");
  });

  test("? 前项 0 或 1 次：ab?c 命中，ab?X9 排除", async ({ window }) => {
    await enterRegexMode(window);
    await expectHit(window, "ab?c");
    await expectMiss(window, "ab?X9");
  });

  test("\\d \\s \\w：\\w+\\s+\\w+ 命中，\\d{9}\\s\\w 排除", async ({ window }) => {
    await enterRegexMode(window);
    await expectHit(window, "\\w+\\s+\\w+");
    await expectMiss(window, "\\d{9}\\s\\w");
  });

  test("[abc] 字符集：[0-9] 命中，[0-9]{9} 排除", async ({ window }) => {
    await enterRegexMode(window);
    await expectHit(window, "[0-9]");
    await expectMiss(window, "[0-9]{9}");
  });

  test("(a|b) 或：cat|dog 命中，xylophone9|q9znu 排除", async ({ window }) => {
    await enterRegexMode(window);
    await expectHit(window, "cat|dog");
    await expectMiss(window, "xylophone9|q9znu");
  });

  test("(?!) 负向前瞻：TODO(?!:) 命中非冒号项，TODO(?=:) 对照命中冒号项", async ({ window }) => {
    await enterRegexMode(window);
    // 正例：负向前瞻命中 "TODO 待办项"（后跟非冒号）
    await expectHit(window, "TODO(?!:)");
    // 对照/反例：正向前瞻才命中 "TODO: 计划项"，印证负向确实排除了冒号情形
    await expectHit(window, "TODO(?=:)");
  });
});
