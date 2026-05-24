# 全局搜索功能规范

## 概述

全局搜索功能允许用户通过 `Ctrl+F` 快捷键唤起搜索面板，搜索文档、问题、回答和标签内容，支持模糊匹配和即时结果展示。

## 功能需求

### 搜索范围

| 类型 | 搜索内容 | 结果元数据 |
|------|----------|------------|
| document | 文档标题 | 问题数、回答数、标签 |
| question | 问题文本 | 所属文档标题 |
| answer | 回答内容 | 所属问题和文档标题 |
| tag | 标签名称 | 关联文档数 |

### 搜索行为

- **唤起方式**：`Ctrl+F` 快捷键
- **防抖延迟**：输入后 300ms 无新输入触发搜索
- **结果限制**：每类型最多 10 条结果
- **匹配方式**：模糊匹配 + 前缀匹配（如 `type*` 匹配 `typescript`）

### 搜索面板 UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 [搜索框_____________________________________] [x]           │
├─────────────────────────────────────────────────────────────────┤
│  📄 文档                                    (最多10条)           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ <mark>Type</mark>Script 进阶指南                         │    │
│  │ 问题: 5  |  回答: 3  |  标签: [TS] [前端]               │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ <mark>Type</mark>Script 入门教程                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ❓ 问题                                    (最多10条)           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 什么是<mark>类型</mark>守卫？                           │    │
│  │ 来自: TS 泛型                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  💬 回答                                    (最多10条)           │
│  💬 标签                                    (最多10条)           │
├─────────────────────────────────────────────────────────────────┤
│  ↑↓ 导航  Enter 跳转  Esc 关闭                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 交互规范

### 键盘交互

| 按键 | 行为 |
|------|------|
| `Ctrl+F` | 唤起搜索面板 |
| `Escape` | 关闭搜索面板 |
| `↑` | 上一个结果 |
| `↓` | 下一个结果 |
| `Enter` | 跳转当前选中结果 |

### 跳转行为

| 搜索类型 | 跳转后行为 |
|----------|------------|
| document | 选中该文档，显示对话视图 |
| question | 选中该文档 + 滚动到该问题 + 高亮 2 秒 |
| answer | 选中该文档 + 滚动到该回答 + 高亮 2 秒 |
| tag | 左侧标签筛选切换到该标签 |

## 技术规范

### FTS5 表结构

```sql
CREATE VIRTUAL TABLE search_fts USING fts5(
  id TEXT,
  type TEXT,
  content TEXT,
  metadata TEXT,
  tokenize='porter unicode61'
);
```

### IPC 接口

```typescript
// 主进程
ipcMain.handle("search:query", async (_, query: string): Promise<SearchResults>);

// 搜索结果类型
interface SearchResults {
  documents: DocumentResult[];
  questions: QuestionResult[];
  answers: AnswerResult[];
  tags: TagResult[];
}

interface DocumentResult {
  id: string;
  title: string;
  questionCount: number;
  answerCount: number;
}

interface QuestionResult {
  id: string;
  text: string;
  documentId: string;
  documentTitle: string;
}

interface AnswerResult {
  id: string;
  content: string;
  questionText: string;
  documentTitle: string;
}

interface TagResult {
  id: string;
  name: string;
  documentCount: number;
}
```

## 组件清单

| 组件 | 文件路径 | 职责 |
|------|----------|------|
| SearchModal | `components/Search/SearchModal.vue` | 搜索模态框容器 |
| SearchInput | `components/Search/SearchInput.vue` | 搜索输入框 |
| SearchResults | `components/Search/SearchResults.vue` | 分类结果列表 |
| SearchResultItem | `components/Search/SearchResultItem.vue` | 单条结果项 |

## 样式规范

- 模态框居中显示，距顶部 100px
- 模态框宽度 600px，最大高度 70vh
- 背景遮罩 rgba(0, 0, 0, 0.5)
- 搜索输入框全宽，padding 16px
- 结果项 hover/selected 状态高亮
- 匹配文本用 `<mark>` 标签高亮，背景色警告色
- 底部显示快捷键提示

## 性能要求

- 搜索响应时间 < 200ms
- 面板唤起时间 < 100ms
- 键盘导航响应 < 50ms
