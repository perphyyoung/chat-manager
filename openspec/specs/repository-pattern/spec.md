# repository-pattern Specification

## Purpose

TBD - created by archiving change refactor-save-to-ddd. Update Purpose after archive.

## Requirements

### Requirement: 实体级 IPC 方法

系统 SHALL 为每个实体类型提供独立的 IPC 方法，替代单体 `db:save`。

#### Scenario: 保存文档元数据

- **WHEN** 调用 `db:document:save` 传入文档 JSON
- **THEN** 系统保存文档的 id, title, created_at, updated_at 字段
- **AND THEN** 返回操作成功状态

#### Scenario: 批量保存问题

- **WHEN** 调用 `db:questions:save` 传入文档 ID 和问题数组
- **THEN** 系统使用 UPSERT 方式保存所有问题
- **AND THEN** 更新 is_deleted 和 deleted_at 字段

#### Scenario: 批量保存答案

- **WHEN** 调用 `answer:saveAllAnswers` 传入文档 ID 和答案数组
- **THEN** 系统使用 UPSERT 方式保存所有答案
- **AND THEN** 删除不再存在的答案

#### Scenario: 批量删除问题

- **WHEN** 调用 `db:questions:delete` 传入问题 ID 数组
- **THEN** 系统从数据库中永久删除这些问题

### Requirement: Repository 协调子实体保存

DocumentRepository SHALL 协调 QuestionRepository 和 AnswerRepository 完成聚合根的完整保存。

#### Scenario: 保存完整文档

- **WHEN** DocumentRepository 的 save 方法被调用
- **THEN** 开启数据库事务
- **AND THEN** 保存文档元数据
- **AND THEN** 调用 QuestionRepository 保存所有问题
- **AND THEN** 调用 AnswerRepository 保存所有答案
- **AND THEN** 提交事务
- **OR** 任何步骤失败时回滚事务

### Requirement: 移除旧的 db:save

系统 SHALL 在迁移完成后完全移除 `db:save` IPC 方法。

#### Scenario: 新实现完全替换旧实现

- **WHEN** 所有调用点迁移到新的 Repository 方法
- **THEN** 系统移除 `db:save` 实现
- **AND THEN** 新实现通过所有 E2E 测试
