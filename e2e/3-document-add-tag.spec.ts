import { expect } from "@playwright/test";
import { test, generateUniqueTagName } from "./utils";

test("add existing tag to document via conversation view", async ({
  window,
}) => {
  // 等待文档列表加载
  await window.waitForSelector(".document-list", { timeout: 2000 });

  // 从左侧标签筛选创建新标签
  await window.locator(".tag-filter__add-btn").click();

  // 等待输入框出现
  await window.waitForSelector(".tag-filter__input", { timeout: 2000 });

  // 输入新标签名称
  const uniqueTagName = generateUniqueTagName("add");
  await window.locator(".tag-filter__input").fill(uniqueTagName);

  // 点击确定按钮创建标签
  await window.locator(".tag-filter__btn-confirm").click();

  // 等待输入框消失，确保标签创建完成
  await window.waitForSelector(".tag-filter__input-wrapper", {
    state: "detached",
    timeout: 2000,
  });

  // 使用第二个文档（避免第一个文档标签过多的问题）
  const document = window.locator(".document-item").nth(1);
  await document.click();

  // 等待对话视图显示
  await window.waitForSelector(".conversation-view", { timeout: 2000 });

  // 获取初始标签数量（从对话视图顶部的 TagSelector）
  const initialTagCount = await window
    .locator(".tag-selector__current .tag-badge")
    .count();

  // 打开标签选择器
  await window.locator(".tag-selector__toggle").click();

  // 等待标签选择器下拉菜单展开
  await window.waitForSelector(".tag-selector__dropdown", { timeout: 2000 });

  // 等待新创建的标签出现在可选列表中并点击
  const newTagOption = window.locator(".tag-selector__option", {
    hasText: uniqueTagName,
  });
  await expect(newTagOption).toBeVisible({ timeout: 2000 });
  await newTagOption.click();

  // 等待标签添加完成（通过验证标签数量增加）
  await expect(window.locator(".tag-selector__current .tag-badge")).toHaveCount(
    initialTagCount + 1,
  );

  // 验证标签数量增加
  const finalTagCount = await window
    .locator(".tag-selector__current .tag-badge")
    .count();
  expect(finalTagCount).toBeGreaterThan(initialTagCount);

  // 验证标签也在文档列表项中显示
  const documentItemTags = document.locator(".tag-badge");
  await expect(documentItemTags.first()).toBeVisible();
});

test("create and add new tag to document via tag filter", async ({
  window,
}) => {
  // 等待文档列表加载
  await window.waitForSelector(".document-list", { timeout: 2000 });

  // 从左侧标签筛选创建新标签
  await window.locator(".tag-filter__add-btn").click();

  // 等待输入框出现
  await window.waitForSelector(".tag-filter__input", { timeout: 2000 });

  // 输入新标签名称
  const uniqueTagName = generateUniqueTagName("new");
  await window.locator(".tag-filter__input").fill(uniqueTagName);

  // 点击确定按钮创建标签
  await window.locator(".tag-filter__btn-confirm").click();

  // 等待输入框消失，确保标签创建完成
  await window.waitForSelector(".tag-filter__input-wrapper", {
    state: "detached",
    timeout: 2000,
  });

  // 使用第二个文档
  const document = window.locator(".document-item").nth(1);
  await expect(document).toBeVisible({ timeout: 2000 });
  await document.click();

  // 等待对话视图显示
  await window.waitForSelector(".conversation-view", { timeout: 2000 });

  // 获取初始标签数量
  const initialTagCount = await window
    .locator(".tag-selector__current .tag-badge")
    .count();

  // 打开标签选择器
  await window.locator(".tag-selector__toggle").click();

  // 等待新创建的标签出现在可选列表中并点击
  const newTagOption = window.locator(".tag-selector__option", {
    hasText: uniqueTagName,
  });
  await expect(newTagOption).toBeVisible({ timeout: 2000 });
  await newTagOption.click();

  // 等待标签添加完成（通过验证标签数量增加）
  await expect(window.locator(".tag-selector__current .tag-badge")).toHaveCount(
    initialTagCount + 1,
  );

  // 验证标签数量增加
  const finalTagCount = await window
    .locator(".tag-selector__current .tag-badge")
    .count();
  expect(finalTagCount).toBeGreaterThan(initialTagCount);

  // 验证新标签已添加到文档
  const addedTagNames = await window
    .locator(".tag-selector__current .tag-badge")
    .allTextContents();
  expect(addedTagNames.some((name) => name.includes(uniqueTagName))).toBe(true);
});

test("remove tag from document via conversation view", async ({ window }) => {
  // 等待文档列表加载
  await window.waitForSelector(".document-list", { timeout: 2000 });

  // 使用第二个文档
  const document = window.locator(".document-item").nth(1);
  await document.click();

  // 等待对话视图显示
  await window.waitForSelector(".conversation-view", { timeout: 2000 });

  // 从左侧标签筛选创建新标签用于测试移除
  await window.locator(".tag-filter__add-btn").click();

  // 等待输入框出现
  await window.waitForSelector(".tag-filter__input", { timeout: 2000 });

  const uniqueTagName = generateUniqueTagName("rem");
  await window.locator(".tag-filter__input").fill(uniqueTagName);

  // 点击确定按钮创建标签
  await window.locator(".tag-filter__btn-confirm").click();

  // 等待输入框消失，确保标签创建完成
  await window.waitForSelector(".tag-filter__input-wrapper", {
    state: "detached",
    timeout: 2000,
  });

  // 打开标签选择器添加新标签
  await window.locator(".tag-selector__toggle").click();

  // 等待新创建的标签出现在可选列表中并点击
  const newTagOption = window.locator(".tag-selector__option", {
    hasText: uniqueTagName,
  });
  await expect(newTagOption).toBeVisible({ timeout: 2000 });
  await newTagOption.click();

  // 等待标签添加到文档
  const tagInDocument = window.locator(".tag-selector__current .tag-badge", {
    hasText: uniqueTagName,
  });
  await expect(tagInDocument).toBeVisible({ timeout: 2000 });

  // 获取添加后的标签数量
  const tagsAfterCreate = await window
    .locator(".tag-selector__current .tag-badge")
    .count();

  // 右键点击标签打开删除菜单
  const tagToRemove = window.locator(".tag-selector__current .tag-badge", {
    hasText: uniqueTagName,
  });
  await expect(tagToRemove).toBeVisible({ timeout: 2000 });
  await tagToRemove.click({ button: "right" });

  // 等待右键菜单出现
  await window.waitForSelector(".tag-context-menu", { timeout: 2000 });

  // 点击右键菜单中的删除标签
  await window.locator(".tag-context-menu__item--danger").click();

  // 等待确认弹窗出现
  await window.waitForSelector(".confirm-dialog", { timeout: 2000 });

  // 点击确认弹窗的确定按钮
  await window.locator(".confirm-dialog .btn-danger").click();

  // 等待标签被移除（通过验证标签数量减少）
  await expect(window.locator(".tag-selector__current .tag-badge")).toHaveCount(
    tagsAfterCreate - 1,
  );

  // 验证特定标签已不存在
  const remainingTagNames = await window
    .locator(".tag-selector__current .tag-badge")
    .allTextContents();
  expect(remainingTagNames.some((name) => name.includes(uniqueTagName))).toBe(
    false,
  );
});

test("update tag name via tag filter", async ({ window }) => {
  // 等待文档列表加载
  await window.waitForSelector(".document-list", { timeout: 2000 });

  // 从左侧标签筛选创建新标签用于测试更新
  await window.locator(".tag-filter__add-btn").click();

  // 等待输入框出现
  await window.waitForSelector(".tag-filter__input", { timeout: 2000 });

  const uniqueTagName = generateUniqueTagName("upd");
  await window.locator(".tag-filter__input").fill(uniqueTagName);

  // 点击确定按钮创建标签
  await window.locator(".tag-filter__btn-confirm").click();

  // 等待输入框消失，确保标签创建完成
  await window.waitForSelector(".tag-filter__input-wrapper", {
    state: "detached",
    timeout: 2000,
  });

  // 使用第二个文档
  const document = window.locator(".document-item").nth(1);
  await expect(document).toBeVisible({ timeout: 2000 });
  await document.click();

  // 等待对话视图显示
  await window.waitForSelector(".conversation-view", { timeout: 2000 });

  // 打开标签选择器添加新标签到文档
  await window.locator(".tag-selector__toggle").click();

  // 等待新创建的标签出现在可选列表中并点击
  const newTagOption = window.locator(".tag-selector__option", {
    hasText: uniqueTagName,
  });
  await expect(newTagOption).toBeVisible({ timeout: 2000 });
  await newTagOption.click();

  // 等待标签添加到文档
  const tagBadge = window.locator(".tag-selector__current .tag-badge", {
    hasText: uniqueTagName,
  });
  await expect(tagBadge).toBeVisible({ timeout: 2000 });

  // 右键点击标签筛选区的标签，选择编辑
  const tagFilterItem = window
    .locator(".tag-filter__item")
    .filter({ hasText: uniqueTagName });
  await tagFilterItem.click({ button: "right" });

  // 等待右键菜单出现
  await window.waitForSelector(".context-menu", { timeout: 2000 });

  // 点击编辑标签菜单（使用 hasText 精确定位）
  await window.locator(".context-menu__item", { hasText: "编辑标签" }).click();

  // 等待编辑输入框出现
  await window.waitForSelector(".tag-filter__input-wrapper", { timeout: 2000 });

  // 输入新标签名
  const updatedTagName = generateUniqueTagName("renamed");
  await window.locator(".tag-filter__input").fill(updatedTagName);

  // 点击保存（编辑标签的保存按钮）
  const confirmButtons = window.locator(".tag-filter__btn-confirm");
  const buttonCount = await confirmButtons.count();
  await confirmButtons.nth(buttonCount - 1).click();

  // 等待标签名更新（通过验证新标签名出现）
  const updatedTagFilterItem = window.locator(".tag-filter__item", {
    hasText: updatedTagName,
  });
  await expect(updatedTagFilterItem).toBeVisible({ timeout: 2000 });

  // 验证标签名在对话视图也已更新
  const updatedTagBadge = window.locator(".tag-selector__current .tag-badge", {
    hasText: updatedTagName,
  });
  await expect(updatedTagBadge).toBeVisible({ timeout: 2000 });

  // 验证旧标签名不存在
  const oldTagBadge = window.locator(".tag-selector__current .tag-badge", {
    hasText: uniqueTagName,
  });
  await expect(oldTagBadge).toHaveCount(0);
});
