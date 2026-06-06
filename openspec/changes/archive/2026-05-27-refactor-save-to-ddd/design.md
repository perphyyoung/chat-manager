# DDD 重构设计文档

## Context

当前架构中，`db:save` IPC 方法承担了过多的职责：

- 保存文档元数据
- 批量保存问题（含软删除状态）
- 批量保存答案
- 保存标签关联
- 管理数据库事务

这违反了 DDD 的分层架构原则，将应用层和领域层的逻辑泄漏到了基础设施层。

## Goals / Non-Goals

**Goals:**

- 将事务控制权上移至应用层/Repository 层
- 拆分单体 `db:save` 为细粒度的实体级 IPC 方法
- 每个 Repository 只负责自己的聚合根持久化
- 保持现有功能和行为不变

**Non-Goals:**

- 不修改领域模型（Document, Question, Answer 等）
- 不修改应用服务接口
- 不引入新的外部依赖
- 不修改 UI 层逻辑

## Decisions

### 1. 事务管理策略

**决策**: Repository 层显式控制事务

```typescript
// Repository 接口增加事务支持
interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

interface DocumentRepository {
  save(document: Document, tx?: Transaction): Promise<void>;
  // ...
}
```

**理由**:

- 应用服务层决定事务边界（一个业务操作可能涉及多个 Repository）
- IPC 层只提供原始能力（begin/commit/rollback）
- 符合 DDD 中"一个聚合根一个事务"的原则

**替代方案**: 应用层直接调用 IPC 事务方法 - 过于底层，容易出错

### 2. IPC 方法拆分

**决策**: 按实体类型拆分

```typescript
// 文档
ipcMain.handle("db:document:save", (_, doc: DocumentJson) => {...})
ipcMain.handle("db:document:delete", (_, id: string) => {...})

// 问题（批量操作）
ipcMain.handle("db:questions:save", (_, docId: string, questions: QuestionJson[]) => {...})
ipcMain.handle("db:questions:delete", (_, ids: string[]) => {...})

// 答案（批量操作）
ipcMain.handle("db:answers:save", (_, docId: string, answers: AnswerJson[]) => {...})
ipcMain.handle("answer:deleteAllAnswers", (_, ids: string[]) => {...})

// 事务
ipcMain.handle("db:transaction:begin", () => {...})
ipcMain.handle("db:transaction:commit", (_, txId: string) => {...})
ipcMain.handle("db:transaction:rollback", (_, txId: string) => {...})
```

**理由**:

- 单一职责，易于测试
- Repository 可以组合使用
- 直接替换 `db:save`，不保留兼容层

**替代方案**: 保留 `db:save` 但内部调用新方法 - 增加复杂度，不如直接替换

### 3. Repository 实现

**决策**: `SqliteDocumentRepository` 协调子 Repository

```typescript
class SqliteDocumentRepository implements DocumentRepository {
  async save(document: Document): Promise<void> {
    const tx = await window.electronAPI.db.transaction.begin();
    try {
      await this.saveDocumentMeta(document, tx);
      await this.questionRepo.saveAll(document.questions, tx);
      await this.answerRepo.saveAll(document.answers, tx);
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }
}
```

**理由**:

- Document 是聚合根，负责协调子实体
- 子 Repository 可以独立测试
- 事务边界清晰

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 事务嵌套问题 | 禁止嵌套事务，Repository 方法接受可选 tx 参数 |
| IPC 调用次数增加 | 批量操作方法减少往返 |
| 迁移风险 | 一次性替换 `db:save`，测试覆盖所有场景 |
| 错误处理复杂 | 统一错误类型，应用层统一处理 |

## Migration Plan

1. **阶段 1**: 添加新的 IPC 方法（不影响现有代码）
2. **阶段 2**: 实现新的 Repository 类，与旧的并行存在
3. **阶段 3**: 应用服务层切换到新 Repository
4. **阶段 4**: 移除旧的 `db:save` 和旧 Repository
5. **阶段 5**: 运行完整 E2E 测试验证
