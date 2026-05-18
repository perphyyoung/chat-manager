import { test, expect } from '@playwright/test'
import { join } from 'path'

test('settings menu opens settings modal', async () => {
  const projectRoot = process.cwd()
  const { _electron: electron } = await import('@playwright/test')

  const electronApp = await electron.launch({
    args: [join(projectRoot, 'out/main/index.js')],
    cwd: projectRoot,
  })

  const window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await window.screenshot({ path: 'e2e/screenshots/before-settings.png' })

  await electronApp.evaluate(async ({ app }) => {
    const menu = app.applicationMenu
    const fileMenu = menu?.items.find(item => item.label === 'File')
    const settingsItem = fileMenu?.submenu?.items.find(item => item.label === '设置')
    if (settingsItem) {
      settingsItem.click()
    }
  })

  await window.waitForTimeout(500)
  await window.screenshot({ path: 'e2e/screenshots/after-settings.png' })

  const settingsModal = window.locator('.modal-content')
  const isVisible = await settingsModal.isVisible().catch(() => false)

  console.log('Settings modal visible:', isVisible)
  expect(isVisible).toBe(true)

  const modalText = await settingsModal.textContent()
  console.log('Modal text:', modalText)
  expect(modalText).toContain('设置')
  expect(modalText).toContain('黑暗主题')

  await electronApp.close()
})

test('settings shortcut is configured correctly', async () => {
  const projectRoot = process.cwd()
  const { _electron: electron } = await import('@playwright/test')

  const electronApp = await electron.launch({
    args: [join(projectRoot, 'out/main/index.js')],
    cwd: projectRoot,
  })

  const window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  // 验证菜单项的快捷键配置
  const accelerator = await electronApp.evaluate(async ({ app }) => {
    const menu = app.applicationMenu
    const fileMenu = menu?.items.find(item => item.label === 'File')
    const settingsItem = fileMenu?.submenu?.items.find(item => item.label === '设置')
    return settingsItem?.accelerator || null
  })

  console.log('Settings accelerator:', accelerator)
  // 验证快捷键已配置（CmdOrCtrl+, 在 Windows 上显示为 Ctrl+,）
  expect(accelerator).toBeTruthy()
  expect(accelerator).toMatch(/CmdOrCtrl\+.|CommandOrControl\+./)

  await electronApp.close()
})
