# sqlite-storage Specification

## Purpose

基于 better-sqlite3 的 SQLite 持久化方案，在 Electron 主进程中管理文档、问题、回答的结构化存储。

## Requirements

### Requirement: SQLite 数据库初始化

系统 SHALL 在应用启动时自动初始化 SQLite 数据库。

#### Scenario: 首次启动创建数据库

- **WHEN** 应用首次启动且数据库文件不存在
- **THEN** 自动在项目根目录的 `py-data/` 文件夹下创建 `chat-manager.db`，并初始化所有表结构

#### Scenario: 表结构创建

- **WHEN** 数据库初始化完成
- **THEN** 创建 `documents`、`questions`、`answers` 三张表（注意：settings 表不再创建，设置使用 LocalStorage）

#### Scenario: 已存在数据库

- **WHEN** 应用启动时数据库文件已存在
- **THEN** 跳过初始化，直接使用现有数据库

### Requirement: 数据库文件位置

系统 SHALL 将数据库文件存储在项目根目录下的 `py-data` 目录中。

#### Scenario: 数据库文件路径

- **WHEN** 应用在主进程启动
- **THEN** 数据库路径为项目根目录下的 `py-data/chat-manager.db`

### Requirement: IPC 通道

系统 SHALL 提供渲染进程与主进程之间的数据库 IPC 通信通道。

#### Scenario: 查找所有文档

- **WHEN** 渲染进程调用 `window.electronAPI.db.findAll()`
- **THEN** 主进程从 SQLite 读取所有文档，返回序列化后的文档数组

#### Scenario: 根据 ID 查找文档

- **WHEN** 渲染进程调用 `window.electronAPI.db.findById(id)`
- **THEN** 主进程根据 id 查询文档并返回

#### Scenario: 保存文档

- **WHEN** 渲染进程调用 `window.electronAPI.db.save(documentJSON)`
- **THEN** 主进程以事务方式写入 documents/questions/answers 三张表

#### Scenario: 删除文档

- **WHEN** 渲染进程调用 `window.electronAPI.db.delete(id)`
- **THEN** 主进程以事务方式删除文档及其关联的问题和回答

#### Scenario: 检查文档是否存在

- **WHEN** 渲染进程调用 `window.electronAPI.db.exists(id)`
- **THEN** 主进程返回布尔值

#### Scenario: 根据问题 ID 查找回答

- **WHEN** 渲染进程调用 `window.electronAPI.answer.findByQuestionId(questionId)`
- **THEN** 主进程从 answers 表查询并返回回答

#### Scenario: 保存回答

- **WHEN** 渲染进程调用 `window.electronAPI.answer.save(answerJSON)`
- **THEN** 主进程将回答写入 answers 表

#### Scenario: 删除回答

- **WHEN** 渲染进程调用 `window.electronAPI.answer.delete(id)`
- **THEN** 主进程从 answers 表删除指定回答

### Requirement: SqliteDocumentRepository

系统 SHALL 在基础设施层提供基于 SQLite 的 DocumentRepository 实现，通过 IPC 与主进程通信。

#### Scenario: 实现 DocumentRepository 接口

- **WHEN** SqliteDocumentRepository 被调用
- **THEN** 调用 window.electronAPI.db 的对应 IPC 方法完成操作

#### Scenario: 查找所有文档

- **WHEN** 调用 SqliteDocumentRepository.findAll()
- **THEN** 通过 IPC 获取文档列表并反序列化为 Document 实体数组

#### Scenario: 根据 ID 查找文档

- **WHEN** 调用 SqliteDocumentRepository.findById(id)
- **THEN** 通过 IPC 获取单个文档并反序列化为 Document 实体

#### Scenario: 保存文档

- **WHEN** 调用 SqliteDocumentRepository.save(document)
- **THEN** 将 Document 实体序列化为 JSON 并通过 IPC 发送到主进程

#### Scenario: 删除文档

- **WHEN** 调用 SqliteDocumentRepository.delete(id)
- **THEN** 通过 IPC 通知主进程删除指定文档

### Requirement: SqliteAnswerRepository

系统 SHALL 在基础设施层提供基于 SQLite 的 AnswerRepository 实现，通过 IPC 与主进程通信。

#### Scenario: 根据问题 ID 查找回答

- **WHEN** 调用 SqliteAnswerRepository.findByQuestionId(questionId)
- **THEN** 通过 IPC 从主进程加载回答，返回 Answer 对象或 null

#### Scenario: 保存回答

- **WHEN** 调用 SqliteAnswerRepository.save(answer)
- **THEN** 将 Answer 实体序列化后通过 IPC 发送到主进程持久化

#### Scenario: 删除回答

- **WHEN** 调用 SqliteAnswerRepository.delete(id)
- **THEN** 通过 IPC 通知主进程删除指定回答

### Requirement: 事务一致性

系统 SHALL 在文档保存和删除操作中使用 SQLite 事务，确保数据一致性。

#### Scenario: 保存文档事务

- **WHEN** 保存文档及其关联的问题和回答
- **THEN** 三张表的写入操作在一个事务中执行，任一失败则全部回滚

#### Scenario: 删除文档事务

- **WHEN** 删除文档及其关联的问题和回答
- **THEN** 三张表的删除操作在一个事务中执行，任一失败则全部回滚
