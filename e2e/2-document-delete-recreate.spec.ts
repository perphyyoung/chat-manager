import { test, expect } from '@playwright/test'
import { join } from 'path'

/**
 * E2E测试: 删除文档后可以重新创建同名文档
 * 测试数据以 e2e 开头，便于识别和清理
 */
test('删除文档后可以重新创建同名文档', async () => {
  const projectRoot = process.cwd()
  const { _electron: electron } = await import('@playwright/test')

  const electronApp = await electron.launch({
    args: [join(projectRoot, 'out/main/index.js')],
    cwd: projectRoot,
  })

  const window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  // 等待应用加载完成
  await window.waitForTimeout(1000)

  // 使用带时间戳的唯一文档名，避免与之前测试残留数据冲突
  const docTitle = `e2e-doc-${Date.now()}`

  // 步骤1: 创建新文档
  console.log('步骤1: 创建新文档')
  const addButton = window.locator('.document-list .fab')
  await addButton.click()

  // 等待对话框出现
  const dialog = window.locator('.dialog')
  await expect(dialog).toBeVisible()

  // 输入文档标题
  const titleInput = dialog.locator('input[type="text"]')
  await titleInput.fill(docTitle)

  // 点击创建按钮
  const createButton = dialog.locator('.btn-primary')
  await createButton.click()

  // 等待对话框关闭
  await expect(dialog).toBeHidden()
  await window.waitForTimeout(500)

  // 验证文档已创建
  const documentItem = window.locator(`.document-item:has-text("${docTitle}")`)
  await expect(documentItem).toBeVisible()
  console.log('文档创建成功')

  // 步骤2: 右键删除文档
  console.log('步骤2: 删除文档')

  await documentItem.click({ button: 'right' })

  // 等待右键菜单出现
  const contextMenu = window.locator('.context-menu')
  await expect(contextMenu).toBeVisible()

  // 点击删除按钮（直接删除，无确认对话框）
  const deleteButton = contextMenu.locator('.menu-item--danger')
  await deleteButton.click()

  // 等待文档从列表消失
  await expect(documentItem).toBeHidden()
  console.log('文档删除成功')

  // 步骤3: 重新创建同名文档
  console.log('步骤3: 重新创建同名文档')
  await addButton.click()

  // 等待对话框出现
  await expect(dialog).toBeVisible()

  // 输入相同的文档标题
  await titleInput.fill(docTitle)

  // 点击创建按钮
  await createButton.click()

  // 等待对话框关闭
  await expect(dialog).toBeHidden()
  await window.waitForTimeout(500)

  // 验证文档重新创建成功
  const recreatedDocumentItem = window.locator(`.document-item:has-text("${docTitle}")`)
  await expect(recreatedDocumentItem).toBeVisible()
  console.log('文档重新创建成功')

  // 验证可以输入标题（点击文档查看详情）
  await recreatedDocumentItem.click()
  await window.waitForTimeout(300)

  // 验证右侧问题列表区域可见
  const questionList = window.locator('.question-list')
  await expect(questionList).toBeVisible()
  console.log('可以正常查看文档详情')

  await electronApp.close()
})
