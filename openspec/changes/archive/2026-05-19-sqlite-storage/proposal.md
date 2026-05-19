## Why

当前领域模型使用 Message/Conversation 设计，但随着需求澄清，发现以下问题：

1. **概念混淆**：Message 既表示问题又表示回答，通过 type 字段区分，不够清晰
2. **不必要的复杂性**：Conversation 作为消息容器，但实际上文档只需要问答对列表
3. **与需求不符**：需求文档定义的是"文档包含若干问答对"，而非"对话消息流"

需要重构为更清晰的 Document-Question-Answer 三层结构。

## What Changes

### 领域模型变更

- **新增** `Answer` 实体（替换 Message）
- **修改** `Question` 实体：添加 `createdAt`/`updatedAt` 时间戳
- **修改** `Document` 实体：移除 `conversation`，添加 `answers` 列表
- **删除** `Message` 实体
- **删除** `Conversation` 实体

### 数据库变更

- **删除** `messages` 表
- **新增** `answers` 表（id, question_id, content, created_at, updated_at）
- **修改** `questions` 表：添加 `created_at`, `updated_at`
- **修改** `documents` 表：添加 `created_at`, `updated_at`

### 架构变更

- **删除** `ConversationApplicationService`
- **新增** `AnswerApplicationService`
- **新增** `AnswerRepository` 接口和实现
- **修改** IPC handlers（消息相关 → 回答相关）
- **修改** Vue 组件（ConversationView → QuestionAnswerView）

## Capabilities

### New Capabilities

- `answer-management`: 回答的增删改查，与问题一对一关联

### Modified Capabilities

- `document-storage`: 文档存储结构从 Document+Conversation 变为 Document+Questions+Answers
- `question-management`: 问题添加时间戳字段

### Removed Capabilities

- `message-management`: 消息概念被回答替代
- `conversation-management`: 对话概念被移除

## Impact

- **BREAKING**: 数据库表结构变更（messages 表被删除，数据需迁移）
- **BREAKING**: 领域模型 API 变更（Message/Conversation 相关代码需重写）
- **BREAKING**: IPC 通道变更（消息相关通道被移除）
- 新增文件：`Answer.ts`, `AnswerRepository.ts`, `AnswerApplicationService.ts` 等
- 删除文件：`Message.ts`, `Conversation.ts`, `ConversationApplicationService.ts` 等
- 修改文件：大量文件需要适配新模型
