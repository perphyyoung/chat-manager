# infrastructure-storage Specification

## Purpose

TBD - created by archiving change ddd-architecture-refactor. Update Purpose after archive.

## Requirements

### Requirement: LocalStorage 文档仓库实现

系统 SHALL 提供基于 localStorage 的 DocumentRepository 实现。

#### Scenario: 从 LocalStorage 读取文档

- **WHEN** 调用 LocalStorageDocumentRepository.findAll()
- **THEN** 从 localStorage 读取 'documents' 键的数据，反序列化为 Document 实体数组

#### Scenario: 文档数据不存在

- **WHEN** LocalStorage 中不存在 'documents' 键时调用 findAll()
- **THEN** 返回空数组

#### Scenario: 保存文档到 LocalStorage

- **WHEN** 调用 LocalStorageDocumentRepository.save(document)
- **THEN** 文档被序列化为 DTO 并保存到 localStorage

#### Scenario: 更新现有文档

- **WHEN** 保存已存在 id 的文档
- **THEN** 更新 localStorage 中对应文档的数据

#### Scenario: 删除文档

- **WHEN** 调用 LocalStorageDocumentRepository.delete(id)
- **THEN** 从 localStorage 中移除指定文档

#### Scenario: 数据格式兼容

- **WHEN** 读取现有 localStorage 数据（旧格式）
- **THEN** 正确反序列化为领域实体，保持数据兼容性

### Requirement: LocalStorage 设置仓库实现

系统 SHALL 提供基于 localStorage 的 SettingsRepository 实现。

#### Scenario: 读取设置

- **WHEN** 调用 LocalStorageSettingsRepository.getSettings()
- **THEN** 从 localStorage 读取 'settings' 键的数据

#### Scenario: 默认设置

- **WHEN** 设置不存在时调用 getSettings()
- **THEN** 返回默认设置对象

#### Scenario: 保存设置

- **WHEN** 调用 LocalStorageSettingsRepository.saveSettings(settings)
- **THEN** 设置被序列化并保存到 localStorage

#### Scenario: 读取单个设置项

- **WHEN** 调用 LocalStorageSettingsRepository.getItem(key)
- **THEN** 返回指定 key 的设置值

#### Scenario: 更新单个设置项

- **WHEN** 调用 LocalStorageSettingsRepository.setItem(key, value)
- **THEN** 更新指定 key 的设置值，保留其他设置不变

### Requirement: 内存仓库实现

系统 SHALL 提供内存版本的 Repository 实现，用于测试环境。

#### Scenario: 内存文档仓库

- **WHEN** 使用 InMemoryDocumentRepository 替代 LocalStorage 实现
- **THEN** 数据存储在内存中，不持久化到 localStorage

#### Scenario: 内存设置仓库

- **WHEN** 使用 InMemorySettingsRepository 替代 LocalStorage 实现
- **THEN** 设置存储在内存中，不持久化到 localStorage

#### Scenario: 重置内存数据

- **WHEN** 调用内存仓库的 clear() 方法
- **THEN** 所有内存中的数据被清空

### Requirement: 序列化/反序列化

系统 SHALL 提供领域实体与 DTO 之间的转换机制。

#### Scenario: 文档序列化

- **WHEN** 将 Document 实体序列化为 DTO
- **THEN** 生成与现有 localStorage 格式兼容的 JSON 对象

#### Scenario: 文档反序列化

- **WHEN** 从 DTO 反序列化为 Document 实体
- **THEN** 正确创建 Document 及其关联的 Question、Conversation、Message 实体

#### Scenario: 嵌套实体处理

- **WHEN** 序列化包含嵌套实体的 Document
- **THEN** 所有嵌套实体被正确序列化

#### Scenario: 日期和特殊类型处理

- **WHEN** 序列化包含 Date 等特殊类型的实体
- **THEN** 类型被正确处理，反序列化后恢复原值
