# domain-entities Specification

## Purpose

TBD - created by archiving change ddd-architecture-refactor. Update Purpose after archive.

## Requirements

### Requirement: Question 充血实体

系统 SHALL 提供 Question 领域实体，封装问题相关的业务逻辑。

#### Scenario: 创建问题实体

- **WHEN** 使用有效参数（id, text, order）创建 Question 实体
- **THEN** 实体被成功创建，属性可被访问

#### Scenario: 更新问题文本

- **WHEN** 调用 Question 的 updateText 方法传入新文本
- **THEN** 问题文本被更新，且文本不能为空

#### Scenario: 调整问题顺序

- **WHEN** 调用 Question 的 changeOrder 方法传入新顺序值
- **THEN** 问题顺序被更新

### Requirement: Message 充血实体

系统 SHALL 提供 Message 领域实体，封装消息相关的业务逻辑。

#### Scenario: 创建消息实体

- **WHEN** 使用有效参数（id, type, content, questionId?）创建 Message 实体
- **THEN** 实体被成功创建

#### Scenario: 验证消息类型

- **WHEN** 创建消息时传入无效的类型值
- **THEN** 抛出 DomainError 异常

#### Scenario: 编辑消息内容

- **WHEN** 调用 Message 的 editContent 方法
- **THEN** 消息内容被更新，且记录编辑时间

### Requirement: Conversation 充血实体

系统 SHALL 提供 Conversation 领域实体，管理消息集合和业务规则。

#### Scenario: 创建对话实体

- **WHEN** 使用 id 和初始消息列表创建 Conversation 实体
- **THEN** 实体被成功创建

#### Scenario: 添加消息到对话

- **WHEN** 调用 Conversation 的 addMessage 方法
- **THEN** 消息被添加到对话末尾

#### Scenario: 获取问题的相关消息

- **WHEN** 调用 Conversation 的 getMessagesByQuestionId 方法
- **THEN** 返回与该问题相关的所有消息（问答对）

#### Scenario: 删除消息

- **WHEN** 调用 Conversation 的 removeMessage 方法传入消息 id
- **THEN** 指定消息从对话中移除

### Requirement: Document 聚合根实体

系统 SHALL 提供 Document 聚合根实体，作为文档领域的聚合根，管理问题和对话。

#### Scenario: 创建文档实体

- **WHEN** 使用有效参数（id, title, questions, conversation）创建 Document 实体
- **THEN** 实体被成功创建

#### Scenario: 更新文档标题

- **WHEN** 调用 Document 的 updateTitle 方法
- **THEN** 文档标题被更新，且标题不能为空

#### Scenario: 添加问题到文档

- **WHEN** 调用 Document 的 addQuestion 方法
- **THEN** 问题被添加到文档的问题列表

#### Scenario: 删除文档中的问题

- **WHEN** 调用 Document 的 removeQuestion 方法传入问题 id
- **THEN** 指定问题从文档中移除，且相关问题消息也被清理

#### Scenario: 重新排序问题

- **WHEN** 调用 Document 的 reorderQuestions 方法传入新顺序数组
- **THEN** 问题按指定顺序重新排列

#### Scenario: 选择问题

- **WHEN** 调用 Document 的 selectQuestion 方法传入问题 id
- **THEN** 验证问题存在后，触发问题选中状态变更

#### Scenario: 获取文档摘要

- **WHEN** 调用 Document 的 getSummary 方法
- **THEN** 返回包含文档基本信息和统计的摘要对象
