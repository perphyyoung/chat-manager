# 问题列表回收站设计

## Context

文档回收站已实现，使用数据库软删除机制（`is_deleted` 字段）。questions 表已在数据库版本 2 中添加 `is_deleted` 和 `deleted_at` 字段，但尚未在应用层使用。

当前问题删除是直接物理删除，通过 `deleteQuestionAndAnswer` 方法调用 Repository 删除数据。

## Goals / Non-Goals

**Goals:**

- 实现问题级别的软删除，与文档回收站保持一致
- 问题删除后可在回收站中恢复
- 恢复问题时同时恢复关联的回答
- 界面与文档回收站保持统一风格

**Non-Goals:**

- 不修改数据库 schema（已支持软删除字段）
- 不实现跨文档恢复（问题只能恢复到原文档）
- 不修改回答的独立回收站逻辑

## Decisions

### 1. 复用文档回收站的 IPC 接口

**决策**: 复用现有的 `db:softDelete` 和 `db:restore` IPC 接口，通过 DocumentRepository 操作问题。

**理由**:

- 问题和回答存储在同一个文档 JSON 中
- 软删除问题实际上是更新文档的 questions 数组
- 避免重复代码，保持接口简洁

**替代方案**: 创建独立的 `question:softDelete` IPC 接口（过于复杂，不必要）

### 2. 在 DocumentRepository 中扩展问题软删除方法

**决策**: 添加 `softDeleteQuestion(documentId, questionId)` 和 `restoreQuestion(documentId, questionId)` 方法。

**理由**:

- 问题和文档是父子关系，问题不能独立于文档存在
- 通过文档 Repository 管理问题生命周期符合领域模型

### 3. 问题回收站 UI 复用 RecycleBinModal 组件

**决策**: 使用现有的 `RecycleBinModal` 组件显示问题回收站。

**理由**:

- 统一的用户体验
- 减少重复代码
- 组件已支持自定义标题和数据

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 恢复问题时回答可能已丢失 | 软删除时同时保存回答内容到问题数据中 |
| 文档被永久删除后无法恢复其问题 | 文档删除时级联删除其问题（符合预期） |
| 问题恢复后顺序可能变化 | 恢复时保留原 sort_order，重新排序 |

## Migration Plan

无需迁移，数据库已支持软删除字段。

## Open Questions

1. 是否需要在回收站中显示问题所属文档名称？（建议：是，便于识别）
2. 问题恢复后是否保持原 sort_order？（建议：是，但需处理冲突）
