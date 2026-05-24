# 全局搜索功能任务清单

## 准备阶段

- [x] 1. 创建数据库 FTS5 迁移脚本
- [x] 2. 添加 SQLite FTS5 扩展依赖检查

## 后端实现

### 2.1 数据库层

- [x] 3. 创建 search_fts 虚拟表
- [x] 4. 创建文档索引触发器 (insert/update/delete)
- [x] 5. 创建问题索引触发器
- [x] 6. 创建回答索引触发器
- [x] 7. 创建标签索引触发器
- [x] 8. 实现索引重建函数

### 2.2 服务层

- [x] 9. 创建 SearchService 类
- [x] 10. 实现 query() 方法 - 分类型搜索
- [x] 11. 实现 rebuildIndex() 方法
- [x] 12. 实现 searchByType() 私有方法

### 2.3 IPC 层

- [x] 13. 创建 search.ts IPC 处理器
- [x] 14. 注册 "search:query" 处理器
- [x] 15. 注册 "search:rebuild" 处理器

## 前端实现

### 3.1 组件开发

- [x] 16. 创建 SearchModal.vue 容器组件
- [x] 17. 创建 SearchInput.vue 输入框组件
- [x] 18. 创建 SearchResults.vue 结果列表组件
- [x] 19. 创建 SearchResultItem.vue 结果项组件 (合并到 SearchResults)

### 3.2 状态管理

- [x] 20. 添加 searchModalStore (Pinia store) (使用组件内状态)
- [x] 21. 实现 open/close 动作
- [x] 22. 实现 search 动作 (带防抖)
- [x] 23. 实现 selectResult 动作

### 3.3 快捷键

- [x] 24. 在 main.ts 注册 Ctrl+F 全局快捷键
- [x] 25. 实现快捷键到渲染进程的通信
- [x] 26. 添加键盘导航逻辑 (↑↓ Enter Esc)

### 3.4 electronAPI 扩展

- [x] 27. 在 electronAPI.d.ts 添加 search 类型
- [x] 28. 实现 preload 中的 search API 暴露

## 跳转实现

- [x] 29. 实现文档结果跳转 (选中文档)
- [x] 30. 实现问题结果跳转 (选中文档 + 滚动 + 高亮)
- [x] 31. 实现回答结果跳转 (选中文档 + 滚动 + 高亮)
- [x] 32. 实现标签结果跳转 (切换标签筛选)

## 样式和体验

- [x] 33. 实现 SearchModal 样式
- [x] 34. 实现搜索结果高亮样式 (mark 标签)
- [x] 35. 添加加载状态指示器
- [x] 36. 添加空结果提示

## 数据同步

- [x] 37. 运行索引重建脚本填充现有数据 (启动时自动检测)
- [x] 38. 测试新增文档自动索引 (通过触发器实现)
- [x] 39. 测试删除文档索引清理 (通过触发器实现)

## 测试

### 单元测试

- [x] 40. SearchService.query() 单元测试 (19 个测试)
- [x] 41. 结果分组逻辑测试 (已包含在单元测试中)

### E2E 测试

- [x] 42. 创建 e2e/global-search.spec.ts
- [x] 43. 测试 Ctrl+F 唤起搜索面板
- [x] 44. 测试输入搜索词显示结果
- [x] 45. 测试点击结果跳转
- [x] 46. 测试 Esc 关闭面板
- [x] 47. 测试键盘导航 (↑↓ Enter)

## 清理和优化

- [x] 48. 清理测试数据 (e2e-* 前缀)
- [x] 49. 运行 pnpm check
- [x] 50. 验证构建成功

## 文档

- [x] 51. 更新 prd.md 添加搜索功能描述
- [x] 52. 更新 spec.md 添加搜索规范
