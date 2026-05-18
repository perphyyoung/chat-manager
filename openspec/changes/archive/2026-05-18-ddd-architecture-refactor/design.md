# DDD 架构重构设计文档

## Context

### 当前架构状态

项目目前采用传统的技术分层架构：

```
src/
├── components/          # UI 组件
│   ├── Document/
│   ├── Question/
│   ├── Conversation/
│   ├── Layout/
│   └── Settings/
├── stores/              # Pinia Store
│   ├── document.ts      # 文档状态管理
│   ├── settings.ts      # 设置状态管理
│   └── counter.ts       # 计数器示例
├── types/               # TypeScript 类型定义
│   └── index.ts         # 贫血的领域模型（interface）
├── data/
│   └── mockData.ts      # 模拟数据
└── main.ts              # 应用入口
```

**当前问题：**

1. **贫血领域模型**：`types/index.ts` 中只有纯数据结构（interface），业务逻辑散落在 Store 和组件中
2. **Store 职责过重**：`documentStore` 既管理状态又包含业务逻辑（如选择文档时重置问题）
3. **缺乏抽象层**：数据持久化直接依赖 localStorage，难以替换或测试
4. **业务规则分散**：文档选择、问题激活等规则散落在组件和 Store 中

### 目标架构

采用领域驱动设计（DDD）的分层架构：

```
src/
├── domain/              # 领域层 - 核心业务逻辑
│   ├── entities/        # 充血领域实体
│   ├── repositories/    # 仓库接口
│   └── events/          # 领域事件
├── application/         # 应用层 - 用例编排
│   ├── services/        # 应用服务
│   └── dto/             # 数据传输对象
├── infrastructure/      # 基础设施层 - 技术实现
│   ├── storage/         # 存储实现
│   └── persistence/     # 持久化适配器
└── presentation/        # 表现层 - UI
    ├── components/      # Vue 组件
    ├── stores/          # Pinia Store（仅 UI 状态）
    └── views/           # 页面视图
```

## Goals / Non-Goals

**Goals:**

- 将贫血模型转换为充血领域实体，封装业务规则
- 引入仓库模式，抽象数据持久化
- 创建应用服务层，分离用例编排与领域逻辑
- 实现领域事件机制，解耦业务逻辑
- 保持现有 UI 组件功能不变
- 保持与现有 localStorage 数据格式兼容

**Non-Goals:**

- 不修改 Electron 主进程和 preload 脚本
- 不添加新的业务功能
- 不改变现有的 UI 设计
- 不引入复杂的事件溯源或 CQRS

## Decisions

### 1. 分层架构设计

**决策**：采用四层架构（Domain / Application / Infrastructure / Presentation）

**理由**：

- 清晰的依赖关系：Domain 不依赖其他层，便于测试和维护
- 符合 DDD 原则：领域层独立，包含核心业务逻辑
- 与现有技术栈兼容：不需要引入新的框架

### 2. 领域实体设计

**决策**：使用 class 实现充血模型，封装业务逻辑

**当前贫血模型**：

```typescript
interface Document {
  id: string
  title: string
  questions: Question[]
  conversation: Conversation
}
```

**目标充血模型**：

```typescript
class Document {
  constructor(
    public readonly id: string,
    public title: string,
    private _questions: Question[],
    private _conversation: Conversation
  ) {}

  get questions(): readonly Question[] { return this._questions }
  
  selectQuestion(questionId: string): void {
    // 业务规则：验证问题是否存在
    const question = this._questions.find(q => q.id === questionId)
    if (!question) throw new DomainError('Question not found')
    // ...
  }
}
```

**理由**：

- 业务逻辑集中在领域实体中，避免散落在各处
- 通过 getter/setter 控制访问，保证数据一致性
- 易于单元测试，不依赖框架

### 3. 仓库模式实现

**决策**：定义仓库接口在 Domain 层，实现在 Infrastructure 层

**接口设计**：

```typescript
// domain/repositories/DocumentRepository.ts
interface DocumentRepository {
  findAll(): Promise<Document[]>
  findById(id: string): Promise<Document | null>
  save(document: Document): Promise<void>
  delete(id: string): Promise<void>
}
```

**实现**：

```typescript
// infrastructure/storage/LocalStorageDocumentRepository.ts
class LocalStorageDocumentRepository implements DocumentRepository {
  private readonly STORAGE_KEY = 'documents'
  
  async findAll(): Promise<Document[]> {
    const data = localStorage.getItem(this.STORAGE_KEY)
    return data ? this.deserialize(JSON.parse(data)) : []
  }
  // ...
}
```

**理由**：

- 抽象持久化细节，便于后续切换存储方式（如 IndexedDB、后端 API）
- 领域层不依赖具体技术，便于测试（可用内存仓库替代）

### 4. 应用服务职责

**决策**：应用服务负责编排领域对象完成用例，不包含业务规则

**示例**：

```typescript
class DocumentApplicationService {
  constructor(
    private documentRepo: DocumentRepository,
    private eventBus: EventBus
  ) {}

  async selectDocument(documentId: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId)
    if (!document) throw new NotFoundError()
    
    // 触发领域事件
    this.eventBus.emit(new DocumentSelectedEvent(documentId))
  }
}
```

**理由**：

- 分离用例编排与业务逻辑
- Store 只负责 UI 状态（如加载状态、选中状态），业务逻辑在领域层

### 5. 领域事件机制

**决策**：使用简单的发布订阅模式实现领域事件

**设计**：

```typescript
// domain/events/EventBus.ts
interface EventBus {
  emit(event: DomainEvent): void
  on<T extends DomainEvent>(type: string, handler: (event: T) => void): void
}

// domain/events/DomainEvent.ts
abstract class DomainEvent {
  readonly occurredAt: Date = new Date()
  abstract readonly type: string
}

// domain/events/DocumentSelectedEvent.ts
class DocumentSelectedEvent extends DomainEvent {
  readonly type = 'DocumentSelected'
  constructor(public readonly documentId: string) {
    super()
  }
}
```

**理由**：

- 解耦业务逻辑，如选择文档后重置问题状态
- 简单实现，不引入复杂的事件总线框架

### 6. 数据兼容性策略

**决策**：保持与现有 localStorage 数据格式兼容，通过适配器转换

**理由**：

- 避免用户数据丢失
- 平滑迁移，不需要数据迁移脚本

**实现方式**：

```typescript
// 反序列化时从 DTO 转换为领域实体
private deserialize(dtos: DocumentDTO[]): Document[] {
  return dtos.map(dto => new Document(
    dto.id,
    dto.title,
    dto.questions.map(q => new Question(q.id, q.text, q.order)),
    new Conversation(dto.conversation.id, dto.conversation.messages.map(...))
  ))
}
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 重构范围大，引入回归 bug | 高 | 1. 保持现有 E2E 测试通过<br>2. 逐步重构，每次只迁移一个领域实体<br>3. 添加领域层单元测试 |
| 团队学习成本 | 中 | 1. 提供清晰的代码示例<br>2. 在代码审查中解释 DDD 概念<br>3. 从简单实体开始迁移 |
| 性能开销（对象转换） | 低 | 1. 数据量在桌面应用通常不大<br>2. 必要时可添加缓存层<br>3. 使用 readonly 避免不必要的复制 |
| 过度设计 | 中 | 1. 严格遵循"简单优先"原则<br>2. 不引入不必要的抽象<br>3. 只在业务逻辑复杂处使用 DDD |

## Migration Plan

### 阶段 1：搭建领域层基础（第 1 周）

1. 创建 `src/domain/` 目录结构
2. 实现领域事件基础（EventBus, DomainEvent）
3. 迁移 `Question` 实体（最简单，无复杂逻辑）
4. 添加单元测试

### 阶段 2：迁移核心实体（第 2 周）

1. 迁移 `Message` 和 `Conversation` 实体
2. 迁移 `Document` 实体（最复杂）
3. 实现仓库接口和 localStorage 实现
4. 更新 Store 使用仓库

### 阶段 3：应用服务层（第 3 周）

1. 创建应用服务（DocumentService, SettingsService）
2. 将业务逻辑从 Store 迁移到应用服务
3. 更新组件调用方式

### 阶段 4：清理和优化（第 4 周）

1. 删除旧的 types/index.ts
2. 清理冗余的 Store 逻辑
3. 完善单元测试覆盖
4. 代码审查和文档更新

### 回滚策略

- 每个阶段完成后提交代码
- 如发现问题，可回滚到上一阶段
- 保持 Git 历史清晰，便于 bisect

## Open Questions

1. **是否需要值对象（Value Object）？**
   - 如 `MessageId`, `DocumentId` 等，目前使用 string 即可，后续如需要可添加

2. **聚合根边界如何划分？**
   - 当前设计：`Document` 是聚合根，包含 `Question[]` 和 `Conversation`
   - 是否需要将 `Conversation` 提升为独立聚合？待实际使用后再决定

3. **是否需要领域服务（Domain Service）？**
   - 当前业务逻辑简单，实体方法足够
   - 如后续有跨实体复杂逻辑，再引入领域服务

4. **单元测试策略？**
   - 领域层：100% 单元测试覆盖
   - 应用层：测试用例编排逻辑
   - 基础设施层：集成测试（使用内存仓库）
