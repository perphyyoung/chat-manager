# domain-events Specification

## Purpose

TBD - created by archiving change ddd-architecture-refactor. Update Purpose after archive.

## Requirements

### Requirement: 领域事件基类

系统 SHALL 提供 DomainEvent 抽象基类，所有领域事件必须继承此类。

#### Scenario: 创建领域事件

- **WHEN** 创建继承 DomainEvent 的具体事件类实例
- **THEN** 事件自动记录发生时间 occurredAt

#### Scenario: 事件类型标识

- **WHEN** 访问领域事件的 type 属性
- **THEN** 返回事件的具体类型标识符

### Requirement: 事件总线接口

系统 SHALL 提供 EventBus 接口，支持领域事件的发布和订阅。

#### Scenario: 发布事件

- **WHEN** 调用 EventBus.emit(event) 传入领域事件
- **THEN** 所有订阅该事件类型的处理器被调用

#### Scenario: 订阅事件

- **WHEN** 调用 EventBus.on(type, handler) 注册事件处理器
- **THEN** 当该类型事件被发布时，处理器被触发

#### Scenario: 取消订阅

- **WHEN** 调用 EventBus.off(type, handler) 移除事件处理器
- **THEN** 该处理器不再接收该类型事件

#### Scenario: 一次性订阅

- **WHEN** 调用 EventBus.once(type, handler) 注册一次性处理器
- **THEN** 处理器只在下一次该类型事件发布时被调用一次

### Requirement: 文档相关领域事件

系统 SHALL 定义文档领域的具体事件类。

#### Scenario: 文档选中事件

- **WHEN** 用户选择文档时
- **THEN** DocumentSelectedEvent 被发布，包含 documentId

#### Scenario: 文档创建事件

- **WHEN** 新文档被创建时
- **THEN** DocumentCreatedEvent 被发布，包含 documentId 和 title

#### Scenario: 文档更新事件

- **WHEN** 文档被修改时
- **THEN** DocumentUpdatedEvent 被发布，包含 documentId 和变更字段

#### Scenario: 文档删除事件

- **WHEN** 文档被删除时
- **THEN** DocumentDeletedEvent 被发布，包含 documentId

### Requirement: 问题相关领域事件

系统 SHALL 定义问题领域的具体事件类。

#### Scenario: 问题激活事件

- **WHEN** 问题被选中/激活时
- **THEN** QuestionActivatedEvent 被发布，包含 documentId 和 questionId

#### Scenario: 问题添加事件

- **WHEN** 新问题被添加到文档时
- **THEN** QuestionAddedEvent 被发布，包含 documentId 和 question 信息

#### Scenario: 问题删除事件

- **WHEN** 问题从文档中移除时
- **THEN** QuestionRemovedEvent 被发布，包含 documentId 和 questionId

#### Scenario: 问题重排序事件

- **WHEN** 文档中的问题顺序被调整时
- **THEN** QuestionsReorderedEvent 被发布，包含 documentId 和新顺序

### Requirement: 设置相关领域事件

系统 SHALL 定义设置领域的具体事件类。

#### Scenario: 主题切换事件

- **WHEN** 用户切换黑暗/明亮主题时
- **THEN** ThemeToggledEvent 被发布，包含 isDarkMode 状态

#### Scenario: 设置变更事件

- **WHEN** 任意应用设置被修改时
- **THEN** SettingsChangedEvent 被发布，包含变更的 key 和 value
