# 文档标签功能实现任务

## 1. 数据层实现

- [x] 1.1 创建 Tag 实体类 (src/domain/entities/Tag.ts)
- [x] 1.2 扩展 Document 实体，添加 tags 关联
- [x] 1.3 创建 TagRepository 接口和实现
- [x] 1.4 扩展 DocumentRepository，添加标签关联方法
- [x] 1.5 创建数据库迁移脚本（tags 表和 document_tags 关联表）

## 2. 应用层实现

- [x] 2.1 创建 CreateTagUseCase (TagApplicationService.createTag)
- [x] 2.2 创建 DeleteTagUseCase (TagApplicationService.deleteTag)
- [x] 2.3 创建 GetAllTagsUseCase (TagApplicationService.getAllTags)
- [x] 2.4 创建 AddTagToDocumentUseCase (TagApplicationService.addTagToDocument)
- [x] 2.5 创建 RemoveTagFromDocumentUseCase (TagApplicationService.removeTagFromDocument)
- [x] 2.6 创建 GetDocumentsByTagUseCase (TagApplicationService.getDocumentsByTag)

## 3. 展示层 - 组件开发

- [x] 3.1 创建 TagBadge 组件（单个标签展示）
- [x] 3.2 创建 TagFilter 组件（左侧面板标签筛选区）
- [x] 3.3 创建 TagSelector 组件（标签选择下拉面板）
- [x] 3.4 创建 CreateTagDialog 组件（内嵌在 TagFilter 和 TagSelector 中）
- [x] 3.5 扩展 DocumentItem 组件，显示文档标签
- [x] 3.6 扩展 ConversationView 组件，添加标签编辑区

## 4. 展示层 - Store 扩展

- [x] 4.1 扩展 documentStore，添加标签相关状态 (allTags, selectedTagId)
- [x] 4.2 添加标签筛选状态和方法 (setTagFilter)
- [x] 4.3 添加标签 CRUD 操作方法 (loadTags, createTag, deleteTag)
- [x] 4.4 添加文档标签关联操作方法 (addTagToDocument, removeTagFromDocument)

## 5. 基础设施层

- [x] 5.1 实现 SQLiteTagRepository
- [x] 5.2 扩展 SQLiteDocumentRepository 的标签方法（通过 IPC 实现）
- [x] 5.3 添加 IPC 通道定义（标签相关）
- [x] 5.4 实现主进程标签处理器

## 6. 集成与测试

- [x] 6.1 运行数据库迁移（自动执行）
- [x] 6.2 验证标签创建功能
- [x] 6.3 验证标签删除功能
- [x] 6.4 验证文档添加标签功能
- [x] 6.5 验证文档移除标签功能
- [x] 6.6 验证标签筛选功能
- [x] 6.7 运行 pnpm check 检查代码
