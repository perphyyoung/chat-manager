## Context

当前应用使用 `localStorage` 存储文档数据（通过 `LocalStorageDocumentRepository`），设置通过 `LocalStorageSettingsRepository` 存储。两个仓库类位于渲染进程中，受限于 localStorage 的 5MB 上限、同步阻塞访问和浏览器清除风险。

应用基于 Electron，主进程与渲染进程通过 `contextBridge` 和 `ipcMain.handle` 通信。已有 `electron/preload.ts` 和 `electron/main.ts` 的 IPC 模式可复用。

`DocumentRepository` 和 `SettingsRepository` 接口已在领域层定义，本次变更只替换实现层，不修改接口。

## Goals / Non-Goals

**Goals:**

- 使用 better-sqlite3 在 Electron 主进程中持久化文档数据
- 提供 SqliteDocumentRepository 实现 DocumentRepository 接口
- 设置存储使用 LocalStorage（简化设计，无需 IPC）
- 通过 IPC 通道暴露数据库操作给渲染进程
- 数据库文件存放在项目根目录下的 `py-data` 目录中
- 重构领域模型：Message/Conversation → Answer，对齐 Document-Question-Answer 三层结构

**Non-Goals:**

- 不修改领域层实体或仓库接口定义（除重构外）
- 不修改应用服务层（除适配新模型外）
- 不涉及数据迁移工具（从 localStorage 迁移到 SQLite）
- 不纳入全文搜索功能

## Decisions

### 1. better-sqlite3 而非 sqlite3

- **选择**：`better-sqlite3`（同步 API）
- **理由**：Electron 主进程中同步调用更简单，不需要 async/await 的心智负担；性能比 sqlite3 快 10 倍；SQLite 操作在独立进程执行，不会阻塞 UI
- **替代方案**：`sqlite3`（异步回调，但 Electron 主进程不需要异步非阻塞）

### 2. IPC 还是主进程直接调用

- **选择**：渲染进程通过 IPC invoke/handle 调用主进程的数据库操作
- **理由**：Electron 安全最佳实践要求 `nodeIntegration: false` 和 `contextIsolation: true`；渲染进程不应直接访问文件系统
- **替代方案**：在渲染进程使用 `node:sqlite`（需要 nodeIntegration: true，降低安全性）

### 3. 数据库文件路径

- **选择**：项目根目录下的 `py-data/chat-manager.db`
- **理由**：开发和调试阶段数据文件在项目目录内，方便查看和管理；与项目代码一起纳入版本控制感知范围（`.gitignore` 管理）
- **替代方案**：`app.getPath('userData')`（跨平台标准位置，但调试时不易访问）

### 4. 数据库设计：文档-问题-回答三层结构

- **选择**：关系表。使用 `documents`、`questions`、`answers` 三张表，通过外键关联
- **理由**：
  - 问题用于右侧导航，回答用于中间内容展示
  - 问题和回答一对一关系，通过 question_id 外键关联
  - 支持时间戳排序（created_at/updated_at）
- **替代方案**：单表存 JSON blob（查询能力弱，与 localStorage 方案无本质区别）

### 5. 设置存储

- **选择**：LocalStorage（渲染进程）
- **理由**：设置数据简单，无需 IPC 通信；与文档数据分离，降低复杂度
- **替代方案**：SQLite settings 表（需要 IPC，增加不必要的复杂度）

### 6. 领域模型重构：Message/Conversation → Answer

- **选择**：移除 Message 和 Conversation，新增 Answer 实体
- **理由**：
  - Message 通过 type 区分问题和回答，概念混淆
  - Conversation 作为消息容器不必要，文档直接包含问答对即可
  - Answer 与 Question 一对一关联，语义更清晰
- **数据表变更**：
  - 删除 `messages` 表
  - 新增 `answers` 表（id, question_id, content, created_at, updated_at）
  - `questions` 表添加 `created_at`, `updated_at`
  - `documents` 表添加 `created_at`, `updated_at`

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| `better-sqlite3` 原生模块需要与 Electron 版本匹配编译 | 使用 `electron-rebuild` 或 `@electron/rebuild` 重建原生模块 |
| SQLite 数据库文件损坏 | 定期使用 `PRAGMA integrity_check`；保留数据库文件的备份机制 |
| 数据库操作在主进程中执行，长时间查询可能阻塞主进程消息循环 | 文档数据量小（单用户桌面应用），查询复杂度有限，同步 API 足够 |
| `py-data/` 目录不存在 | 首次启动时自动创建 `py-data/` 目录并初始化数据库 |
| 领域模型重构影响面广 | 分阶段实施，先更新实体，再更新仓库，最后更新 UI |

## Migration Plan

### 阶段 1：领域层重构

1. 创建 `Answer` 实体（替换 Message）
2. 修改 `Question` 实体添加 `createdAt`/`updatedAt`
3. 修改 `Document` 实体：移除 `conversation`，添加 `answers` 列表
4. 删除 `Message` 和 `Conversation` 实体

### 阶段 2：数据库层重构

1. 修改 `electron/database.ts`：
   - 移除 `messages` 表创建
   - 添加 `answers` 表创建
   - 修改 `questions` 表添加时间戳
   - 修改 `documents` 表添加时间戳
2. 更新 IPC handlers（消息相关 → 回答相关）

### 阶段 3：基础设施层重构

1. 创建 `AnswerRepository` 接口
2. 修改 `SqliteDocumentRepository` 适配新领域模型
3. 创建 `SqliteAnswerRepository` 实现

### 阶段 4：应用层重构

1. 删除 `ConversationApplicationService`
2. 创建 `AnswerApplicationService`
3. 修改 `DocumentApplicationService` 适配新结构

### 阶段 5：表现层重构

1. 修改 Vue 组件适配新模型
2. 更新 stores 和 mockData

### 阶段 6：验证

1. 运行全部测试确保通过

**回滚策略**：保留 git 历史，可随时回滚到重构前状态
