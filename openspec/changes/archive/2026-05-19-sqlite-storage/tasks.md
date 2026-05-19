# SQLite Storage 重构任务列表

## 目标

将 Message/Conversation 领域模型重构为 Answer 实体，对齐新的领域设计（文档-问题-回答三层结构）。

## 1. 领域层重构

- [x] 1.1 创建 `Answer` 实体（替换 Message）
- [x] 1.2 修改 `Question` 实体添加 `createdAt`/`updatedAt`
- [x] 1.3 修改 `Document` 实体：移除 `conversation`，添加 `answers` 列表
- [x] 1.4 删除 `Message` 实体
- [x] 1.5 删除 `Conversation` 实体
- [x] 1.6 更新领域层 barrel 文件

## 2. 数据库层重构

- [x] 2.1 修改 `electron/database.ts`：
  - [x] 移除 `messages` 表创建
  - [x] 添加 `answers` 表创建（id, question_id, content, created_at, updated_at）
  - [x] 修改 `questions` 表添加 `created_at`, `updated_at`
  - [x] 修改 `documents` 表添加 `created_at`, `updated_at`
- [x] 2.2 更新 IPC handlers：
  - [x] 移除消息相关 handlers
  - [x] 添加回答相关 handlers（answer:findByQuestionId, answer:save, answer:delete）

## 3. 基础设施层重构

- [x] 3.1 创建 `AnswerRepository` 接口
- [x] 3.2 修改 `SqliteDocumentRepository` 适配新领域模型
- [x] 3.3 创建 `SqliteAnswerRepository` 实现
- [x] 3.4 更新 infrastructure barrel 文件

## 4. 应用层重构

- [x] 4.1 删除 `ConversationApplicationService`
- [x] 4.2 创建 `AnswerApplicationService`
- [x] 4.3 修改 `DocumentApplicationService` 适配新结构
- [x] 4.4 修改领域事件（MessageEvents → AnswerEvents）

## 5. 表现层重构

- [x] 5.1 修改 `ConversationView.vue` → 适配新模型
- [x] 5.2 创建 `AnswerEditor.vue` 替换 `MessageBubble.vue`
- [x] 5.3 更新 stores 和 mockData

## 6. 测试更新

- [x] 6.1 删除 Message 相关测试
- [x] 6.2 删除 Conversation 相关测试
- [x] 6.3 更新 Question 测试（添加时间戳）
- [x] 6.4 运行所有测试确保通过

## 7. 文档更新

- [x] 7.1 更新 `通用语言.md`
- [x] 7.2 创建 `prd.md`
- [x] 7.3 创建 `spec.md`
- [x] 7.4 更新 `openspec` 变更文件

---

## 验证

- ✅ `pnpm check` 通过（类型检查 + 代码风格）
- ✅ `pnpm test` 通过（33 个测试全部通过）

---

## 原 SQLite Storage 任务（已完成）

<details>
<summary>点击查看已完成的原始任务</summary>

- [x] 安装 `better-sqlite3` 和 `@types/better-sqlite3` 依赖
- [x] 验证 better-sqlite3 在 Electron 主进程中可正常加载
- [x] 创建 `electron/database.ts`，封装 SQLite 数据库初始化和表结构创建
- [x] 在 `electron/main.ts` 中初始化数据库实例
- [x] 实现设置读写的 IPC handlers（save/load）
- [x] 在 `electron/preload.ts` 中注册 IPC 通道
- [x] 创建 `SqliteSettingsRepository` 实现 `SettingsRepository` 接口
- [x] 更新 `src/presentation/stores/settings.ts` 改用 SqliteSettingsRepository
- [x] 移除 `LocalStorageSettingsRepository.ts`
- [x] 添加 `py-data/` 到 `.gitignore`

</details>
