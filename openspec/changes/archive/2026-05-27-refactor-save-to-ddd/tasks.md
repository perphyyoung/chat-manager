# DDD 重构任务列表

## 1. 基础设施层 - IPC 方法拆分

- [x] 1.1 添加 `db:transaction:begin` IPC 方法
- [x] 1.2 添加 `db:transaction:commit` IPC 方法
- [x] 1.3 添加 `db:transaction:rollback` IPC 方法
- [x] 1.4 添加 `document:saveDocument` IPC 方法（仅文档元数据）
- [x] 1.5 添加 `question:saveAllQuestions` IPC 方法（批量 UPSERT）
- [x] 1.6 添加 `db:questions:delete` IPC 方法（批量删除）
- [x] 1.7 添加 `answer:saveAllAnswers` IPC 方法（批量 UPSERT）
- [x] 1.8 添加 `answer:deleteAllAnswers` IPC 方法（批量删除）
- [x] 1.9 在 `electron/preload/index.ts` 暴露新的 IPC 接口

## 2. 基础设施层 - Repository 重构

- [x] 2.1 创建 `SqliteQuestionRepository` 类
- [x] 2.2 创建 `SqliteAnswerRepository` 类
- [x] 2.3 重构 `SqliteDocumentRepository` 使用子 Repository
- [x] 2.4 添加事务支持到 Repository 接口
- [x] 2.5 实现 Repository 层的事务协调逻辑

## 3. 应用层 - 服务调整

- [x] 3.1 更新 `DocumentApplicationService` 使用新的 Repository
- [x] 3.2 确保事务边界在应用服务层控制
- [x] 3.3 添加错误处理和回滚逻辑

## 4. 迁移和清理

- [x] 4.1 迁移所有 `db:save` 调用点到新的 Repository 方法
- [x] 4.2 确保现有测试继续通过
- [x] 4.3 移除旧的 `db:save` 实现

## 5. 测试验证

- [x] 5.1 运行单元测试验证 Repository 逻辑
- [x] 5.2 运行 E2E 测试验证完整流程
- [x] 5.3 手动测试事务回滚场景
- [x] 5.4 验证软删除功能正常工作

## 6. 文档和清理

- [x] 6.1 归档 OpenSpec 变更
