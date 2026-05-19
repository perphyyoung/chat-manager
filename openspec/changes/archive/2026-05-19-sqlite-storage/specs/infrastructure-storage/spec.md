# infrastructure-storage Specification (Delta)

## MODIFIED Requirements

### Requirement: SQLite 文档仓库实现

系统 SHALL 提供基于 SQLite 的 DocumentRepository 实现，通过 Electron IPC 与主进程通信。

#### Scenario: 从 SQLite 读取文档

- **WHEN** 调用 SqliteDocumentRepository.findAll()
- **THEN** 通过 IPC 请求主进程查询 SQLite，反序列化为 Document 实体数组

#### Scenario: 文档数据不存在

- **WHEN** SQLite 中无数据时调用 findAll()
- **THEN** 返回空数组

#### Scenario: 保存文档到 SQLite

- **WHEN** 调用 SqliteDocumentRepository.save(document)
- **THEN** 文档通过 IPC 发送到主进程，以事务方式写入 SQLite（documents/questions/answers 三张表）

#### Scenario: 更新现有文档

- **WHEN** 保存已存在 id 的文档
- **THEN** 更新 SQLite 中对应文档及其关联数据

#### Scenario: 删除文档

- **WHEN** 调用 SqliteDocumentRepository.delete(id)
- **THEN** 通过 IPC 通知主进程从 SQLite 中删除文档及其关联的问题和回答

### Requirement: SQLite 回答仓库实现

系统 SHALL 提供基于 SQLite 的 AnswerRepository 实现，通过 Electron IPC 与主进程通信。

#### Scenario: 根据问题 ID 查找回答

- **WHEN** 调用 SqliteAnswerRepository.findByQuestionId(questionId)
- **THEN** 通过 IPC 请求主进程从 SQLite 查询回答，反序列化为 Answer 实体或 null

#### Scenario: 保存回答

- **WHEN** 调用 SqliteAnswerRepository.save(answer)
- **THEN** 回答通过 IPC 发送到主进程写入 SQLite 的 answers 表

#### Scenario: 删除回答

- **WHEN** 调用 SqliteAnswerRepository.delete(id)
- **THEN** 通过 IPC 通知主进程从 SQLite 删除指定回答

### Requirement: LocalStorage 设置仓库实现

系统 SHALL 提供基于 LocalStorage 的 SettingsRepository 实现（设置不再使用 SQLite）。

#### Scenario: 读取设置

- **WHEN** 调用 LocalStorageSettingsRepository.getSettings()
- **THEN** 从 localStorage 读取设置，返回 Settings 对象

#### Scenario: 默认设置

- **WHEN** 设置不存在时调用 getSettings()
- **THEN** 返回默认设置对象

#### Scenario: 保存设置

- **WHEN** 调用 LocalStorageSettingsRepository.saveSettings(settings)
- **THEN** 将设置序列化后写入 localStorage

#### Scenario: 读取单个设置项

- **WHEN** 调用 LocalStorageSettingsRepository.getItem(key)
- **THEN** 返回指定 key 的设置值

#### Scenario: 更新单个设置项

- **WHEN** 调用 LocalStorageSettingsRepository.setItem(key, value)
- **THEN** 更新指定 key 的设置值并保存到 localStorage

## REMOVED Requirements

### Requirement: LocalStorage 文档仓库实现

**Reason**: localStorage 已替换为 SQLite。localStorage 存在 5MB 上限、同步阻塞、数据易丢失等问题，不适合桌面应用持久化。

**Migration**: 现有 LocalStorageDocumentRepository 被 SqliteDocumentRepository 替代，通过 Electron IPC 与 main process 中的 better-sqlite3 通信。

### Requirement: SQLite 设置仓库实现

**Reason**: 设置数据简单，使用 LocalStorage 更轻量，无需 IPC 通信。

**Migration**: SqliteSettingsRepository 被移除，改用 LocalStorageSettingsRepository。

### Requirement: Message 相关存储

**Reason**: 领域模型重构，Message 实体被 Answer 实体替代。

**Migration**: messages 表被移除，改用 answers 表存储回答数据。

### Requirement: Conversation 相关存储

**Reason**: 领域模型重构，Conversation 实体被移除，文档直接包含问题和回答列表。

**Migration**: Conversation 相关存储逻辑被移除，文档通过外键关联 questions 和 answers 表。
