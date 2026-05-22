# 添加问题列表回收站

## Why

目前只有文档列表支持回收站功能，问题列表删除后无法恢复。为了保持一致的用户体验并防止误删导致的数据丢失，需要为问题列表添加回收站功能。

## What Changes

- 在问题列表左下角添加回收站悬浮按钮
- 右键删除问题时移入回收站（而非直接删除）
- 回收站弹窗支持查看已删除问题、恢复、永久删除、清空操作
- 使用数据库软删除（`is_deleted` 字段）持久化存储
- 问题恢复时同时恢复关联的回答

## Capabilities

### New Capabilities

- `question-recycle-bin`: 问题列表回收站功能，包括软删除、恢复、永久删除

### Modified Capabilities

- `document-recycle-bin`: 复用现有的数据库软删除机制，统一文档和问题的回收站实现模式

## Impact

- **数据库**: questions 表已支持 `is_deleted` 字段（版本 2 迁移）
- **Repository**: 需要扩展软删除方法支持问题级别操作
- **Store**: 添加问题回收站相关状态和方法
- **UI**: QuestionList 组件添加回收站按钮和弹窗
- **IPC**: 可能需要添加问题级别的软删除/恢复接口
