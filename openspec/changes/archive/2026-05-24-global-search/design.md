# 全局搜索功能技术设计

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         搜索架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Vue 组件层                             │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  SearchModal.vue                                  │   │   │
│  │  │  - 搜索输入框 (防抖 300ms)                       │   │   │
│  │  │  - 分类结果列表                                  │   │   │
│  │  │  - 键盘导航支持                                  │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  └────────────────────────────┬────────────────────────────┘   │
│                               │ IPC                             │
│                               ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Electron Main                         │   │
│  │                                                          │   │
│  │  ipcMain.handle("search:query", ...)                    │   │
│  │                         │                               │   │
│  │                         ▼                               │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  SearchService                                    │   │   │
│  │  │  - buildSearchIndex()                            │   │   │
│  │  │  - executeSearch(query)                           │   │   │
│  │  │  - getSearchResult(params)                       │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                         │                               │   │
│  │                         ▼                               │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  SQLite Database                                │   │   │
│  │  │  - documents 表                                 │   │   │
│  │  │  - questions 表                                  │   │   │
│  │  │  - answers 表                                    │   │   │
│  │  │  - tags 表                                       │   │   │
│  │  │  - search_fts (FTS5 虚拟表)                     │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 数据库设计

### FTS5 虚拟表

```sql
-- 创建 FTS5 虚拟表
CREATE VIRTUAL TABLE search_fts USING fts5(
  id TEXT,           -- 原记录 ID
  type TEXT,         -- 'document' | 'question' | 'answer' | 'tag'
  content TEXT,      -- 可搜索文本内容
  metadata TEXT,     -- JSON 格式元数据
  tokenize='porter unicode61'
);

-- 创建索引
CREATE INDEX idx_search_fts_type ON search_fts(type);
```

### 元数据结构

```typescript
interface SearchMetadata {
  // Document
  title?: string;
  questionCount?: number;
  answerCount?: number;
  tagIds?: string[];

  // Question
  questionId?: string;
  documentId?: string;
  documentTitle?: string;

  // Answer
  answerId?: string;
  questionText?: string;
  documentTitle?: string;

  // Tag
  tagName?: string;
  documentCount?: number;
}
```

### 触发器（索引同步）

```sql
-- 文档插入/更新/删除
CREATE TRIGGER documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO search_fts VALUES (
    new.id, 'document',
    new.title,
    json_object('title', new.title, 'createdAt', new.createdAt)
  );
END;

CREATE TRIGGER documents_ad AFTER DELETE ON documents BEGIN
  DELETE FROM search_fts WHERE id = old.id AND type = 'document';
END;

-- 问题插入/更新/删除
CREATE TRIGGER questions_ai AFTER INSERT ON questions BEGIN
  INSERT INTO search_fts VALUES (
    new.id, 'question',
    new.text,
    json_object('questionId', new.id, 'documentId', new.documentId)
  );
END;

-- 回答插入/更新/删除
CREATE TRIGGER answers_ai AFTER INSERT ON answers BEGIN
  INSERT INTO search_fts VALUES (
    new.id, 'answer',
    new.content,
    json_object('answerId', new.id, 'questionId', new.questionId)
  );
END;

-- 标签插入/更新/删除
CREATE TRIGGER tags_ai AFTER INSERT ON tags BEGIN
  INSERT INTO search_fts VALUES (
    new.id, 'tag',
    new.name,
    json_object('tagName', new.name)
  );
END;
```

## IPC 接口设计

### 主进程处理

```typescript
// electron/main.ts
ipcMain.handle("search:query", async (_, query: string) => {
  if (!query || query.trim().length === 0) {
    return { documents: [], questions: [], answers: [], tags: [] };
  }

  const results = await db.prepare(`
    SELECT id, type, content, metadata
    FROM search_fts
    WHERE search_fts MATCH ?
    ORDER BY rank
    LIMIT 40
  `).all(`"${query}"*`);

  // 分组返回
  return groupByType(results);
});

ipcMain.handle("search:rebuild", async () => {
  // 重建搜索索引（管理员操作）
  await rebuildSearchIndex();
});
```

### 渲染进程调用

```typescript
// src/presentation/components/SearchModal.vue
const searchResults = ref<SearchResults>({
  documents: [],
  questions: [],
  answers: [],
  tags: []
});

async function handleSearch(query: string) {
  searchResults.value = await window.electronAPI.search.query(query);
}
```

## 组件设计

### SearchModal.vue

```
位置：src/presentation/components/Search/
文件：
- SearchModal.vue          # 模态容器
- SearchInput.vue         # 搜索输入框
- SearchResults.vue       # 结果列表
- SearchResultItem.vue    # 单条结果
```

#### 组件状态

```typescript
interface SearchModalState {
  isOpen: boolean;
  query: string;
  results: SearchResults;
  selectedIndex: number;
  selectedType: SearchType | null;
  isLoading: boolean;
}

type SearchType = 'document' | 'question' | 'answer' | 'tag';

interface SearchResults {
  documents: DocumentResult[];
  questions: QuestionResult[];
  answers: AnswerResult[];
  tags: TagResult[];
}
```

#### 键盘导航

```typescript
function handleKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'Escape':
      close();
      break;
    case 'ArrowDown':
      e.preventDefault();
      navigateNext();
      break;
    case 'ArrowUp':
      e.preventDefault();
      navigatePrev();
      break;
    case 'Enter':
      e.preventDefault();
      selectCurrent();
      break;
  }
}
```

### 样式设计

```scss
.search-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  z-index: 9999;

  &__container {
    width: 600px;
    max-height: 70vh;
    background: var(--color-bg);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  &__input-wrapper {
    padding: 16px;
    border-bottom: 1px solid var(--color-border);
  }

  &__results {
    max-height: calc(70vh - 60px);
    overflow-y: auto;
  }

  &__group {
    padding: 8px 16px;

    &-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
    }
  }

  &__item {
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;

    &--selected {
      background: var(--color-primary-light);
    }

    mark {
      background: var(--color-warning);
      padding: 0 2px;
      border-radius: 2px;
    }
  }

  &__hint {
    padding: 8px 16px;
    font-size: 12px;
    color: var(--color-text-secondary);
    border-top: 1px solid var(--color-border);
  }
}
```

## 服务层设计

### SearchService

```typescript
// src/main/services/SearchService.ts
export class SearchService {
  constructor(private db: Database) {}

  async query(searchText: string): Promise<SearchResults> {
    const limit = 10;

    const [documents, questions, answers, tags] = await Promise.all([
      this.searchByType('document', searchText, limit),
      this.searchByType('question', searchText, limit),
      this.searchByType('answer', searchText, limit),
      this.searchByType('tag', searchText, limit),
    ]);

    return { documents, questions, answers, tags };
  }

  private async searchByType<T>(
    type: SearchType,
    query: string,
    limit: number
  ): Promise<T[]> {
    const stmt = this.db.prepare(`
      SELECT id, content, metadata
      FROM search_fts
      WHERE type = ? AND search_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const results = await stmt.all(type, `"${query}"*`, limit);
    return results.map(r => this.parseResult<T>(r));
  }

  private parseResult<T>(row: any): T {
    const metadata = JSON.parse(row.metadata);
    return {
      id: row.id,
      content: row.content,
      ...metadata,
    } as T;
  }

  async rebuildIndex(): Promise<void> {
    // 清空现有索引
    await this.db.exec('DELETE FROM search_fts');

    // 重新构建所有文档索引
    await this.rebuildDocuments();
    await this.rebuildQuestions();
    await this.rebuildAnswers();
    await this.rebuildTags();
  }
}
```

## 全局快捷键

```typescript
// src/main/shortcuts.ts
import { globalShortcut } from 'electron';

export function registerGlobalShortcuts() {
  // Ctrl+F 打开搜索
  globalShortcut.register('CommandOrControl+F', () => {
    mainWindow.webContents.send('shortcut:open-search');
  });
}

export function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
}
```

## 目录结构

```
src/
├── main/
│   ├── index.ts                 # 主入口
│   ├── services/
│   │   └── SearchService.ts      # 搜索服务
│   └── ipc/
│       └── search.ts             # 搜索 IPC 处理器
│
└── renderer/
    └── presentation/
        └── components/
            └── Search/
                ├── SearchModal.vue      # 搜索模态框
                ├── SearchInput.vue      # 搜索输入框
                ├── SearchResults.vue     # 结果列表
                └── SearchResultItem.vue # 结果项
```

## 测试策略

### 单元测试

- SearchService.query() 测试
- 结果分组逻辑测试

### E2E 测试

- Ctrl+F 唤起搜索面板
- 输入搜索词显示结果
- 点击结果跳转
- Esc 关闭面板
- 键盘导航

## 性能考虑

1. **防抖**：300ms 延迟避免频繁搜索
2. **限制结果数**：每类型最多 10 条
3. **索引优化**：使用 FTS5 的 rank 排序
4. **异步处理**：搜索在主进程异步执行，不阻塞 UI
