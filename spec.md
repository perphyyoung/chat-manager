# Chat Manager 技术规范

## 1. 概述

本文档定义 Chat Manager 的技术实现规范，包含数据库设计、领域模型、API 接口等。

---

## 2. 数据库设计

### 2.1 表结构

```sql
-- 文档表
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 问题表（右侧导航）
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 回答表（中间内容）
CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL UNIQUE,  -- 一对一关系
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
```

### 2.2 关系说明

- **documents : questions** = 1 : N（一个文档有多个问题）
- **questions : answers** = 1 : 1（一个问题对应一个回答）
- 删除文档级联删除关联的问题和回答
- 删除问题级联删除关联的回答

### 2.3 索引设计

```sql
-- 问题表索引
CREATE INDEX idx_questions_document_id ON questions(document_id);
CREATE INDEX idx_questions_sort_order ON questions(document_id, sort_order);

-- 回答表索引
CREATE INDEX idx_answers_question_id ON answers(question_id);
```

---

## 3. 领域模型

### 3.1 实体定义

```typescript
// 文档（聚合根）
class Document {
  constructor(
    public readonly id: string,
    private _title: string,
    private _questions: Question[] = [],
  )
  
  get title(): string
  get questions(): readonly Question[]
  get questionCount(): number
  
  updateTitle(newTitle: string): void
  addQuestion(text: string, order?: number): Question
  removeQuestion(questionId: string): void
  reorderQuestions(orderedIds: string[]): void
  getQuestionById(id: string): Question | undefined
}

// 问题（实体）
class Question {
  constructor(
    public readonly id: string,
    private _text: string,
    private _order: number,
  )
  
  get text(): string
  get order(): number
  
  updateText(newText: string): void
  changeOrder(newOrder: number): void
}

// 回答（实体）
class Answer {
  constructor(
    public readonly id: string,
    public readonly questionId: string,
    private _content: string,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date(),
  )
  
  get content(): string
  get createdAt(): Date
  get updatedAt(): Date
  
  editContent(newContent: string): void
}
```

### 3.2 值对象

```typescript
// 问答对（值对象）
interface QuestionAnswerPair {
  question: Question;
  answer: Answer | null;  // 可能尚未创建回答
}

// 文档摘要（值对象）
interface DocumentSummary {
  id: string;
  title: string;
  questionCount: number;
  answeredCount: number;
}
```

---

## 4. 仓库接口

```typescript
interface DocumentRepository {
  findAll(): Promise<Document[]>;
  findById(id: string): Promise<Document | null>;
  save(document: Document): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

interface QuestionRepository {
  findByDocumentId(documentId: string): Promise<Question[]>;
  findById(id: string): Promise<Question | null>;
  save(question: Question): Promise<void>;
  delete(id: string): Promise<void>;
}

interface AnswerRepository {
  findByQuestionId(questionId: string): Promise<Answer | null>;
  findByDocumentId(documentId: string): Promise<Answer[]>;
  save(answer: Answer): Promise<void>;
  delete(id: string): Promise<void>;
}
```

---

## 5. 应用服务

```typescript
class DocumentApplicationService {
  constructor(
    private documentRepo: DocumentRepository,
    private eventBus: EventBus,
  )
  
  async loadAllDocuments(): Promise<DocumentSummary[]>
  async selectDocument(id: string): Promise<void>
  async createDocument(title: string): Promise<Document>
  async updateDocumentTitle(id: string, newTitle: string): Promise<void>
  async deleteDocument(id: string): Promise<void>
}

class QuestionApplicationService {
  constructor(
    private documentRepo: DocumentRepository,
    private questionRepo: QuestionRepository,
    private eventBus: EventBus,
  )
  
  async addQuestion(documentId: string, text: string): Promise<Question>
  async updateQuestionText(id: string, newText: string): Promise<void>
  async deleteQuestion(id: string): Promise<void>
  async reorderQuestions(documentId: string, orderedIds: string[]): Promise<void>
  async selectQuestion(id: string): Promise<void>
}

class AnswerApplicationService {
  constructor(
    private answerRepo: AnswerRepository,
    private eventBus: EventBus,
  )
  
  async addAnswer(questionId: string, content: string): Promise<Answer>
  async updateAnswerContent(id: string, newContent: string): Promise<void>
  async deleteAnswer(id: string): Promise<void>
}
```

---

## 6. IPC 接口（Electron）

### 6.1 文档相关

```typescript
// 主进程暴露
ipcMain.handle('document:findAll', () => {...})
ipcMain.handle('document:findById', (_, id: string) => {...})
ipcMain.handle('document:save', (_, documentJson: string) => {...})
ipcMain.handle('document:delete', (_, id: string) => {...})

// 预加载脚本暴露
electronAPI.document = {
  findAll: () => ipcRenderer.invoke('document:findAll'),
  findById: (id: string) => ipcRenderer.invoke('document:findById', id),
  save: (json: string) => ipcRenderer.invoke('document:save', json),
  delete: (id: string) => ipcRenderer.invoke('document:delete', id),
}
```

### 6.2 问题相关

```typescript
ipcMain.handle('question:findByDocumentId', (_, documentId: string) => {...})
ipcMain.handle('question:save', (_, questionJson: string) => {...})
ipcMain.handle('question:delete', (_, id: string) => {...})
ipcMain.handle('question:reorder', (_, documentId: string, orderedIds: string[]) => {...})
```

### 6.3 回答相关

```typescript
ipcMain.handle('answer:findByQuestionId', (_, questionId: string) => {...})
ipcMain.handle('answer:findByDocumentId', (_, documentId: string) => {...})
ipcMain.handle('answer:save', (_, answerJson: string) => {...})
ipcMain.handle('answer:delete', (_, id: string) => {...})
```

---

## 7. DTO 定义

```typescript
// DocumentDTO
interface DocumentDTO {
  id: string;
  title: string;
  questions: QuestionDTO[];
  answers: AnswerDTO[];
}

// QuestionDTO
interface QuestionDTO {
  id: string;
  text: string;
  order: number;
}

// AnswerDTO
interface AnswerDTO {
  id: string;
  questionId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// QuestionAnswerPairDTO（用于界面展示）
interface QuestionAnswerPairDTO {
  question: QuestionDTO;
  answer: AnswerDTO | null;
}
```

---

## 8. 领域事件

```typescript
// 文档事件
class DocumentSelectedEvent { constructor(public readonly documentId: string) }
class DocumentCreatedEvent { constructor(public readonly documentId: string) }
class DocumentUpdatedEvent { constructor(public readonly documentId: string) }
class DocumentDeletedEvent { constructor(public readonly documentId: string) }

// 问题事件
class QuestionActivatedEvent { constructor(public readonly questionId: string) }
class QuestionAddedEvent { constructor(public readonly documentId: string, public readonly questionId: string) }
class QuestionRemovedEvent { constructor(public readonly documentId: string, public readonly questionId: string) }
class QuestionsReorderedEvent { constructor(public readonly documentId: string) }

// 回答事件
class AnswerCreatedEvent { constructor(public readonly questionId: string, public readonly answerId: string) }
class AnswerEditedEvent { constructor(public readonly answerId: string) }
class AnswerDeletedEvent { constructor(public readonly answerId: string) }
```

---

## 9. 排序功能

### 9.1 排序字段

| 类型 | 字段 | 说明 |
|------|------|------|
| 文档排序 | `createdAt` | 创建时间 |
| 文档排序 | `updatedAt` | 更新时间 |
| 文档排序 | `title` | 文档标题（中文拼音排序） |
| 问题排序 | `sortOrder` | 出现顺序（文档中的原始顺序） |
| 问题排序 | `createdAt` | 创建时间 |
| 问题排序 | `updatedAt` | 更新时间 |
| 问题排序 | `title` | 问题文本（中文拼音排序） |

### 9.2 排序方向

- `asc` - 升序（从小到大）
- `desc` - 降序（从大到小，默认）

### 9.3 持久化

排序偏好保存到 `localStorage`，键名为 `chat-manager-sort-preferences`：

```typescript
interface SortPreferences {
  documentSortField: SortField;      // 文档排序字段
  documentSortOrder: SortOrder;      // 文档排序方向
  questionSortField: QuestionSortField;  // 问题排序字段
  questionSortOrder: SortOrder;      // 问题排序方向
}
```

### 9.4 默认排序

- 文档列表：按 `createdAt` 降序（最新创建的在前）
- 问题列表：按 `sortOrder` 升序（按文档中的原始顺序）

---

## 9. 界面组件

```typescript
// 左侧
DocumentList.vue      // 文档列表
DocumentItem.vue      // 单个文档项

// 中间（聊天式布局）
QuestionAnswerView.vue    // 问答对详情视图，包含问答对列表
QuestionBubble.vue        // 问题气泡组件（右对齐，主题色背景）
AnswerBubble.vue          // 回答气泡组件（左对齐，表面色背景）
AnswerEditor.vue          // 回答编辑器

// 右侧
QuestionNavList.vue       // 问题导航列表
QuestionNavItem.vue       // 单个导航项
```

### 9.1 聊天式布局规范

| 组件 | 对齐方式 | 背景色 | 文字色 | 圆角 | 最大宽度 |
|------|---------|--------|--------|------|---------|
| QuestionBubble | 右对齐 (margin-left: auto) | 主题色（蓝色/紫色等） | 白色（固定） | 12px 12px 12px 4px | 70% |
| AnswerBubble | 左对齐 (margin-right: auto) | 卡片背景色（随主题变化） | 正文色（随主题变化） | 12px 12px 4px 12px | 85% |

**主题适配**：

- **浅色主题**：
  - AnswerBubble 背景：浅灰色（如 #f5f5f5）
  - AnswerBubble 边框：浅灰色（如 #e0e0e0）
  - 文字：深灰色（如 #333333）
- **深色主题**：
  - AnswerBubble 背景：深灰色（如 #2d2d2d）
  - AnswerBubble 边框：深灰色（如 #404040）
  - 文字：浅灰色（如 #e0e0e0）
- **QuestionBubble**：主题色和白色文字在两种主题下保持不变

**布局说明**：

- 问答对按顺序垂直排列
- 每个问答对内部：问题在上（右对齐，像微信自己发的消息），回答在下（左对齐，像微信对方发的消息）
- 问答对之间保持适当间距（24px）
- 整体内容区域有水平内边距（16px）

---

## 10. 注意事项

1. **事务管理**：保存文档时，questions 和 answers 应在同一事务中处理
2. **级联删除**：删除文档自动级联删除关联的 questions 和 answers
3. **排序维护**：questions 的 sort_order 应连续，删除后需要重新排序
4. **空回答处理**：question 可以暂时没有 answer（未创建或已删除）
5. **时间戳更新**：任何实体编辑后更新 updated_at，created_at 保持不变
