# DDD 架构重构任务列表

## 1. 领域层基础搭建

- [x] 1.1 创建 `src/domain/` 目录结构
- [x] 1.2 实现领域错误基类 `DomainError`
- [x] 1.3 实现领域事件基类 `DomainEvent`
- [x] 1.4 实现简单事件总线 `SimpleEventBus`
- [x] 1.5 添加领域层单元测试框架和示例测试

## 2. 领域实体实现

- [x] 2.1 实现 `Question` 充血实体（含业务方法）
- [x] 2.2 为 `Question` 实体添加单元测试
- [x] 2.3 实现 `Message` 充血实体（含业务方法）
- [x] 2.4 为 `Message` 实体添加单元测试
- [x] 2.5 实现 `Conversation` 充血实体（含业务方法）
- [x] 2.6 为 `Conversation` 实体添加单元测试
- [x] 2.7 实现 `Document` 聚合根实体（含业务方法）
- [x] 2.8 为 `Document` 实体添加单元测试

## 3. 领域事件定义

- [x] 3.1 实现 `DocumentSelectedEvent`
- [x] 3.2 实现 `DocumentCreatedEvent`
- [x] 3.3 实现 `DocumentUpdatedEvent`
- [x] 3.4 实现 `DocumentDeletedEvent`
- [x] 3.5 实现 `QuestionActivatedEvent`
- [x] 3.6 实现 `QuestionAddedEvent`
- [x] 3.7 实现 `QuestionRemovedEvent`
- [x] 3.8 实现 `QuestionsReorderedEvent`
- [x] 3.9 实现 `ThemeToggledEvent`
- [x] 3.10 实现 `SettingsChangedEvent`

## 4. 仓库接口定义

- [x] 4.1 定义 `DocumentRepository` 接口
- [x] 4.2 定义 `SettingsRepository` 接口
- [x] 4.3 定义 DTO 类型（与现有数据格式兼容）

## 5. 基础设施层实现

- [x] 5.1 实现 `LocalStorageDocumentRepository`
- [x] 5.2 实现 `LocalStorageSettingsRepository`
- [x] 5.3 实现序列化/反序列化工具函数
- [x] 5.4 实现 `InMemoryDocumentRepository`（测试用）
- [x] 5.5 实现 `InMemorySettingsRepository`（测试用）
- [x] 5.6 添加基础设施层集成测试

## 6. 应用服务层实现

- [x] 6.1 实现 `DocumentApplicationService`
- [x] 6.2 为 `DocumentApplicationService` 添加单元测试
- [x] 6.3 实现 `SettingsApplicationService`
- [x] 6.4 为 `SettingsApplicationService` 添加单元测试
- [x] 6.5 实现 `ConversationApplicationService`
- [x] 6.6 为 `ConversationApplicationService` 添加单元测试

## 7. 表现层适配

- [x] 7.1 重构 `DocumentStore`，使用 `DocumentApplicationService`
- [x] 7.2 重构 `SettingsStore`，使用 `SettingsApplicationService`
- [x] 7.3 更新 `DocumentItem` 组件（prop 类型改为接口）
- [x] 7.4 更新 `DocumentList` 组件（调用方式不变）
- [x] 7.5 更新 `QuestionItem` 组件（prop 类型改为接口）
- [x] 7.6 更新 `QuestionList` 组件（调用方式不变）
- [x] 7.7 更新 `MessageBubble` 组件（prop 类型改为接口）
- [x] 7.8 更新 `ConversationView` 组件（调用方式不变）
- [x] 7.9 更新 `SettingsModal` 组件（调用方式不变）

## 8. 旧代码清理

- [x] 8.1 `src/types/` → `bak/types/`（无引用）
- [x] 8.2 `src/stores/` → `src/presentation/stores/`
- [x] 8.3 `src/components/` → `src/presentation/components/`
- [x] 8.4 `src/data/` → `src/infrastructure/data/`
- [x] 8.5 `src/constants/` → `src/infrastructure/constants/`
- [x] 8.6 `src/router/` → `src/presentation/router/`
- [x] 8.7 `src/assets/` → `src/presentation/assets/`
- [x] 8.8 `src/App.vue` → `src/presentation/App.vue`
- [x] 8.9 `src/main.ts` → `src/presentation/main.ts`
- [x] 8.10 `src/utils` → 删除（空目录）

## 9. 测试验证

- [x] 9.1 运行所有单元测试并确保通过（108 个测试全部通过）
- [x] 9.2 运行 E2E 测试并确保通过（2 个测试全部通过）
- [x] 9.3 验证 localStorage 数据兼容性（集成测试覆盖）
- [x] 9.4 验证主题切换功能正常（E2E 测试验证）
- [x] 9.5 验证构建成功
- [x] 9.6 验证类型检查通过
- [x] 9.7 验证 lint 通过

## 10. 完成状态

- [x] **全部 61 个任务完成 ✓**

---

## 最终目录结构

```
src/
├── domain/                       # 领域层
│   ├── entities/                 # 充血实体
│   ├── errors/                   # 领域错误
│   ├── events/                   # 领域事件 + 事件总线
│   └── repositories/             # 仓库接口
├── application/                  # 应用层
│   ├── services/                 # 应用服务
│   └── dto/                      # 数据传输对象
├── infrastructure/               # 基础设施层
│   ├── storage/                  # LocalStorage/InMemory 仓库
│   ├── persistence/              # 序列化/反序列化
│   ├── data/                     # 模拟数据
│   └── constants/                # 常量
└── presentation/                 # 表现层
    ├── components/               # Vue 组件
    ├── stores/                   # Pinia Store（仅 UI 状态）
    ├── router/                   # 路由配置
    ├── assets/                   # 静态资源
    ├── App.vue                   # 根组件
    └── main.ts                   # 入口文件
```
