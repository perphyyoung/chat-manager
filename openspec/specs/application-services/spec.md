# application-services Specification

## Purpose

TBD - created by archiving change ddd-architecture-refactor. Update Purpose after archive.

## Requirements

### Requirement: 文档应用服务

系统 SHALL 提供 DocumentApplicationService，编排文档相关的用例。

#### Scenario: 加载所有文档

- **WHEN** 调用 DocumentApplicationService.loadAllDocuments()
- **THEN** 从仓库获取所有文档并触发 DocumentsLoadedEvent

#### Scenario: 选择文档

- **WHEN** 调用 DocumentApplicationService.selectDocument(documentId)
- **THEN** 验证文档存在，触发 DocumentSelectedEvent，重置当前问题状态

#### Scenario: 创建新文档

- **WHEN** 调用 DocumentApplicationService.createDocument(title, questions)
- **THEN** 创建 Document 实体，保存到仓库，触发 DocumentCreatedEvent

#### Scenario: 更新文档标题

- **WHEN** 调用 DocumentApplicationService.updateDocumentTitle(documentId, newTitle)
- **THEN** 获取文档实体，更新标题，保存到仓库，触发 DocumentUpdatedEvent

#### Scenario: 删除文档

- **WHEN** 调用 DocumentApplicationService.deleteDocument(documentId)
- **THEN** 从仓库删除文档，触发 DocumentDeletedEvent

#### Scenario: 添加问题到文档

- **WHEN** 调用 DocumentApplicationService.addQuestion(documentId, questionText)
- **THEN** 创建 Question 实体，添加到文档，保存，触发 QuestionAddedEvent

#### Scenario: 选择问题

- **WHEN** 调用 DocumentApplicationService.selectQuestion(documentId, questionId)
- **THEN** 验证文档和问题存在，触发 QuestionActivatedEvent

### Requirement: 设置应用服务

系统 SHALL 提供 SettingsApplicationService，管理应用设置相关的用例。

#### Scenario: 加载设置

- **WHEN** 调用 SettingsApplicationService.loadSettings()
- **THEN** 从仓库获取设置并应用（如主题）

#### Scenario: 切换主题

- **WHEN** 调用 SettingsApplicationService.toggleTheme()
- **THEN** 切换当前主题状态，保存到仓库，触发 ThemeToggledEvent

#### Scenario: 设置主题模式

- **WHEN** 调用 SettingsApplicationService.setDarkMode(isDark)
- **THEN** 设置指定主题状态，保存到仓库，触发 ThemeToggledEvent

#### Scenario: 更新设置项

- **WHEN** 调用 SettingsApplicationService.updateSetting(key, value)
- **THEN** 更新指定设置项，保存到仓库，触发 SettingsChangedEvent

### Requirement: 对话应用服务

系统 SHALL 提供 ConversationApplicationService，管理对话相关的用例。

#### Scenario: 加载对话

- **WHEN** 调用 ConversationApplicationService.loadConversation(documentId)
- **THEN** 获取指定文档的对话及消息列表

#### Scenario: 发送消息

- **WHEN** 调用 ConversationApplicationService.sendMessage(documentId, content, type)
- **THEN** 创建 Message 实体，添加到对话，保存，触发 MessageSentEvent

#### Scenario: 回复问题

- **WHEN** 调用 ConversationApplicationService.answerQuestion(documentId, questionId, answer)
- **THEN** 创建答案消息关联到问题，添加到对话，保存

#### Scenario: 编辑消息

- **WHEN** 调用 ConversationApplicationService.editMessage(documentId, messageId, newContent)
- **THEN** 更新消息内容，保存，触发 MessageEditedEvent

#### Scenario: 删除消息

- **WHEN** 调用 ConversationApplicationService.deleteMessage(documentId, messageId)
- **THEN** 从对话中移除消息，保存，触发 MessageDeletedEvent
