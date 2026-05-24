# 问题列表回收站实现任务

## 1. Repository 层扩展

- [x] 1.1 在 `DocumentRepository` 接口中添加 `softDeleteQuestion(documentId, questionId)` 方法
- [x] 1.2 在 `DocumentRepository` 接口中添加 `restoreQuestion(documentId, questionId)` 方法
- [x] 1.3 在 `DocumentRepository` 接口中添加 `getDeletedQuestions(documentId)` 方法
- [x] 1.4 在 `DocumentRepository` 接口中添加 `permanentlyDeleteQuestion(documentId, questionId)` 方法
- [x] 1.5 在 `DocumentRepository` 接口中添加 `clearDeletedQuestions(documentId)` 方法
- [x] 1.6 在 `SQLiteDocumentRepository` 中实现上述方法

## 2. IPC 层扩展

- [x] 2.1 在 `ipc/handlers.ts` 中添加 `question:softDelete` 处理器
- [x] 2.2 在 `ipc/handlers.ts` 中添加 `question:restore` 处理器
- [x] 2.3 在 `ipc/handlers.ts` 中添加 `question:getDeleted` 处理器
- [x] 2.4 在 `ipc/handlers.ts` 中添加 `question:permanentlyDelete` 处理器
- [x] 2.5 在 `ipc/handlers.ts` 中添加 `question:clearDeleted` 处理器
- [x] 2.6 在 `preload.ts` 中暴露新的 IPC 接口

## 3. Store 层扩展

- [x] 3.1 在 `document.ts` store 中添加 `deletedQuestions` 状态
- [x] 3.2 添加 `softDeleteQuestion(documentId, questionId)` action
- [x] 3.3 添加 `restoreQuestion(documentId, questionId)` action
- [x] 3.4 添加 `loadDeletedQuestions(documentId)` action
- [x] 3.5 添加 `permanentlyDeleteQuestion(documentId, questionId)` action
- [x] 3.6 添加 `clearDeletedQuestions(documentId)` action
- [x] 3.7 添加 `deletedQuestionCount` getter

## 4. UI 组件实现

- [x] 4.1 在 `QuestionList.vue` 左下角添加回收站悬浮按钮
- [x] 4.2 修改问题右键删除逻辑，改为软删除
- [x] 4.3 集成 `RecycleBinModal` 组件显示问题回收站
- [x] 4.4 配置回收站弹窗显示问题所属文档名称
- [x] 4.5 实现回收站为空时的空状态提示

## 5. 测试与验证

- [x] 5.5 运行 `pnpm check` 确保类型和代码风格检查通过
