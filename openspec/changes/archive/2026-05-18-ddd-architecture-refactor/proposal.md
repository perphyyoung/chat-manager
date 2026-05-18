# DDD 架构重构提案

## Why

当前项目采用传统的技术分层架构（components/stores/types），业务逻辑分散在 Pinia Store 和 Vue 组件中，领域模型只有贫血的 TypeScript interface。随着功能增加，业务规则散落在各处，难以维护和测试。需要引入领域驱动设计（DDD）架构，将业务逻辑集中到领域层，提高代码的可维护性和可测试性。

## What Changes

- **BREAKING**: 重构项目目录结构，从按技术分层改为按业务分层（domain/application/infrastructure/presentation）
- **BREAKING**: 将贫血的领域模型（interface）改为充血模型（class），将业务逻辑从 Store 移到领域实体
- 引入仓库模式（Repository Pattern），抽象数据持久化，支持本地存储和后续扩展
- 创建应用服务层，编排领域对象完成用例，Store 只负责 UI 状态管理
- 添加领域事件机制，解耦业务逻辑
- 保持现有 UI 组件和 Electron 集成不变（仅调整调用方式）

## Capabilities

### New Capabilities

- `domain-entities`: 定义充血领域实体（Document, Question, Conversation, Message）及其业务方法
- `domain-repository`: 定义仓库接口和本地存储实现，支持文档的增删改查
- `domain-events`: 实现领域事件系统（DocumentSelected, QuestionActivated 等）
- `application-services`: 创建应用服务，封装用例（LoadDocuments, SelectDocument, ToggleTheme 等）
- `infrastructure-storage`: 实现基于 localStorage 的仓库持久化

### Modified Capabilities

- 无现有 spec 需要修改（这是架构层面的重构，不涉及功能需求变更）

## Impact

- **src/**: 目录结构完全重构，原 stores/ 和 types/ 将被替换
- **组件**: Vue 组件需要调整，从直接调用 Store 改为调用应用服务
- **测试**: 需要为领域实体和应用服务添加单元测试
- **数据**: 保持与现有 localStorage 数据格式兼容
- **Electron**: 主进程和 preload 脚本无需修改
