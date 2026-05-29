# 重构 save 逻辑以符合 DDD 架构

## Why

当前 `db:save` IPC 方法在基础设施层处理了过多的业务逻辑，包括文档、问题、答案、标签的保存和事务管理。这违反了 DDD 的分层原则，导致领域逻辑散落在错误的地方，难以维护和测试。

## What Changes

- **拆分 `db:save` IPC 方法**：将单体保存逻辑拆分为独立的实体级操作（`db:saveDocument`, `db:saveQuestions`, `db:saveAnswers`）
- **事务控制上移至应用层**：Repository 层控制事务边界，使用 `db:beginTransaction`, `db:commit`, `db:rollback`
- **Repository 实现具体持久化逻辑**：`SqliteDocumentRepository`, `SqliteQuestionRepository`, `SqliteAnswerRepository` 各自处理实体的保存
- **保持领域模型纯净**：领域层不依赖基础设施细节

## Capabilities

### New Capabilities

- `transaction-management`: 数据库事务管理能力，支持 begin/commit/rollback
- `repository-pattern`: 完整的 Repository 模式实现，每个聚合根有独立的 Repository

### Modified Capabilities

- `document-persistence`: 文档持久化逻辑从单体 save 改为分层保存

## Impact

- **electron/main.ts**: `db:save` 拆分为多个细粒度 IPC 方法
- **src/infrastructure/storage/**: Repository 类重构，添加事务支持
- **src/application/services/**: 应用服务层显式控制事务
- **现有功能**: 保持兼容，行为不变
