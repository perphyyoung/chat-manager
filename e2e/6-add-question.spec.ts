import { expect } from "@playwright/test";
import {
  test,
  cleanupE2EDocuments,
  generateUniqueDocTitle,
  createDocumentWithAnswer,
  clickDocumentByTitle,
  openAddDialog,
  deleteFirstQuestion,
  logToFile,
} from "./utils";

test.describe("添加问题功能", () => {
  test.beforeEach(async ({ window }) => {
    await window.waitForSelector(".document-list", { timeout: 2000 });
    await cleanupE2EDocuments(window);
    const title = generateUniqueDocTitle("add_question");
    await createDocumentWithAnswer(window, title);
    await window.waitForSelector(".document-list", { timeout: 2000 });
    await clickDocumentByTitle(window, title);
  });

  test("正常添加问答对", async ({ window }) => {
    // 监听控制台日志
    const consoleLogs: string[] = [];
    window.on("console", (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    await openAddDialog(window);

    const questionText = `测试问题_${Date.now()}`;
    const answerText = `测试回答_${Date.now()}`;

    await window.locator(".dialog-input").fill(questionText);
    await window.locator(".dialog-textarea").fill(answerText);

    await window.locator(".btn-primary").click();

    // 等待一段时间让控制台日志输出
    await window.waitForTimeout(500);

    try {
      await window.waitForSelector(".add-question-model", {
        state: "detached",
        timeout: 2000,
      });
    } catch (e) {
      await logToFile(window, "error", `对话框关闭超时: ${e}`);
      throw e;
    }

    const questionList = window.locator(".question-item");
    await expect(questionList).toHaveCount(2);

    const newQuestion = questionList.filter({ hasText: questionText });
    await expect(newQuestion).toBeVisible();
  });

  test("添加问答对后，回收站有内容时再添加新问答对", async ({ window }) => {
    await deleteFirstQuestion(window);

    const recycleBadge = window.locator(".recycle-badge");
    await expect(recycleBadge).toBeVisible();

    await openAddDialog(window);

    const questionText = `新问题_回收站后_${Date.now()}`;
    const answerText = `新回答_回收站后_${Date.now()}`;

    await window.locator(".dialog-input").fill(questionText);
    await window.locator(".dialog-textarea").fill(answerText);
    await window.locator(".btn-primary").click();

    await window.waitForSelector(".add-question-model", {
      state: "detached",
      timeout: 2000,
    });

    const questionList = window.locator(".question-item");
    await expect(questionList).toHaveCount(1);

    const newQuestion = questionList.filter({ hasText: questionText });
    await expect(newQuestion).toBeVisible();
  });

  test("添加问答对后，删除多个问题，再添加新问答对", async ({ window }) => {
    await openAddDialog(window);
    await window.locator(".dialog-input").fill("第二个问题");
    await window.locator(".dialog-textarea").fill("第二个回答");
    await window.locator(".btn-primary").click();
    await window.waitForSelector(".add-question-model", {
      state: "detached",
      timeout: 2000,
    });

    await deleteFirstQuestion(window);
    await deleteFirstQuestion(window);

    const recycleBadge = window.locator(".recycle-badge");
    await expect(recycleBadge).toBeVisible();
    const badgeText = await recycleBadge.textContent();
    expect(parseInt(badgeText ?? "0")).toBeGreaterThanOrEqual(2);

    await openAddDialog(window);

    const questionText = `多删除后_${Date.now()}`;
    const answerText = `多删除后回答_${Date.now()}`;

    await window.locator(".dialog-input").fill(questionText);
    await window.locator(".dialog-textarea").fill(answerText);
    await window.locator(".btn-primary").click();

    await window.waitForSelector(".add-question-model", {
      state: "detached",
      timeout: 2000,
    });

    const questionList = window.locator(".question-item");
    await expect(questionList).toHaveCount(1);

    const newQuestion = questionList.filter({ hasText: questionText });
    await expect(newQuestion).toBeVisible();
  });

  test("回收站有内容时清空，再添加新问答对", async ({ window }) => {
    await deleteFirstQuestion(window);

    const recycleBtn = window.locator(".fab--recycle");
    await recycleBtn.click();
    await window.waitForSelector(".deleted-questions-modal", { timeout: 2000 });

    const clearBtn = window.locator(".deleted-questions-modal .btn-clear");
    await clearBtn.click();
    await window.waitForSelector(".confirm-dialog", { timeout: 2000 });
    await window.locator(".confirm-dialog .btn-danger").click();
    await window.waitForSelector(".deleted-questions-modal", {
      state: "detached",
      timeout: 2000,
    });

    await openAddDialog(window);

    const questionText = `清空后_${Date.now()}`;
    const answerText = `清空后回答_${Date.now()}`;

    await window.locator(".dialog-input").fill(questionText);
    await window.locator(".dialog-textarea").fill(answerText);
    await window.locator(".btn-primary").click();

    await window.waitForSelector(".add-question-model", {
      state: "detached",
      timeout: 2000,
    });

    const questionList = window.locator(".question-item");
    await expect(questionList).toHaveCount(1);

    const newQuestion = questionList.filter({ hasText: questionText });
    await expect(newQuestion).toBeVisible();
  });

  test("添加空问答对被阻止", async ({ window }) => {
    await openAddDialog(window);

    const createBtn = window.locator(".btn-primary");
    await expect(createBtn).toBeDisabled();

    await window.locator(".dialog-input").fill("只填问题");
    await expect(createBtn).toBeDisabled();

    await window.locator(".dialog-input").clear();
    await window.locator(".dialog-textarea").fill("只填回答");
    await expect(createBtn).toBeDisabled();
  });

  test("取消添加问答对", async ({ window }) => {
    await openAddDialog(window);

    await window.locator(".dialog-input").fill("取消的问题");
    await window.locator(".dialog-textarea").fill("取消的回答");

    await window.locator(".btn-secondary").click();

    await window.waitForSelector(".add-question-model", {
      state: "detached",
      timeout: 2000,
    });

    const questionList = window.locator(".question-item");
    await expect(questionList).toHaveCount(1);

    const cancelledQuestion = questionList.filter({ hasText: "取消的问题" });
    await expect(cancelledQuestion).toHaveCount(0);
  });
});
