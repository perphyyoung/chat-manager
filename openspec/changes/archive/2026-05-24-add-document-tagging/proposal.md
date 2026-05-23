# 文档标签功能

## Why

当前文档管理缺乏分类和组织能力，用户无法对文档进行分组筛选。随着文档数量增加，查找特定文档变得困难。标签系统可以让用户自由创建分类维度（如"工作"、"学习"、"重要"等），支持多标签筛选，大幅提升文档管理效率。

## What Changes

- **新增全局标签管理**：用户可以创建、查看、删除全局标签
- **文档标签关联**：支持为文档添加/移除多个标签（多对多关系）
- **标签筛选**：左侧面板新增标签筛选区，点击标签可筛选显示对应文档
- **标签展示**：
  - 左侧面板：文档列表项显示标签
  - 中间面板：当前文档顶部显示标签编辑区
- **数据模型扩展**：Document 实体新增 tags 字段，新增 Tag 实体

## Capabilities

### New Capabilities

- `tag-management`: 全局标签的创建、删除、列表展示
- `document-tagging`: 为文档添加/移除标签，展示文档标签
- `tag-filtering`: 通过标签筛选文档列表

### Modified Capabilities

- 无

## Impact

- **领域层**: 新增 Tag 实体，Document 实体新增 tags 关联
- **应用层**: 新增标签相关的 use case（创建标签、添加标签到文档等）
- **展示层**:
  - DocumentList.vue - 添加标签筛选区和文档标签展示
  - ConversationView.vue - 添加文档标签编辑区
  - 新增 TagFilter、TagInput、TagList 等组件
- **基础设施层**: 新增 TagRepository，扩展 DocumentRepository
- **存储**: 数据库 schema 新增 tags 表和 document_tags 关联表
