# todo

本文件仅供临时性的进度追踪，其它文件不得引用。

## 正则搜索异步化（设计）

### 背景

`querySearchRegex` 的"复杂正则"分支（含元字符时）在主进程同步全表扫描 `documents/questions/answers/tags` 原文并逐个 `match`，会阻塞渲染线程事件循环。字面量降级分支已改走 SQL `INSTR`（保留主进程，无需迁移）。

### 方案

1. 抽取纯函数 `searchRegexFromDb(db, searchText, limit)`（`electron/regexSearch.ts`），现有复杂分支逻辑原样搬入并以参数传 db；`querySearchRegex` 复杂分支与 worker 都调用它，行为零差异。
2. 新增 worker `electron/searchWorker.ts`：
   - `workerData` 收 dbPath，worker 内 `new DatabaseSync(dbPath)` 自行打开（`node:sqlite` 句柄不能跨 worker 传输）。
   - 连接懒创建、跨消息复用；每次 `SELECT` 是独立读事务，自动获得 WAL 最新快照。只读操作，与主进程写不冲突。
3. 主进程接入：惰性建 worker + `Promise`/request id/超时兜底；`search:querySearchRegex` 复杂分支调它，**失败/超时/不可用则退化为同步兜底**，结果永不丢失。`closeDatabase`/退出时 `terminate`.
4. 打包：electron-vite 主进程加 **额外入口**（`rollupOptions.input` 追加 searchWorker），运行时 `new Worker(path.join(__dirname, "searchWorker.js"))`；确保 `package.json` `files` 清单包含 `out/main/searchWorker.js`。

### 风险点

- **打包回归**：worker 需 electron-vite 双入口 + asar 内读取 + 打包清单三处协同，任一处缺失即运行时找不到 worker 文件（与 markdownlint-cli2 打包坑同类，最易翻车）。
- **句柄不可跨线程**：`DatabaseSync` 无法传 worker，必须独立打开文件，故 dbPath 传入与只读打开是关键。
- **生命周期**：worker 连接与主进程 db 需同步关闭，否则句柄泄漏。
- **兜底依赖**：worker 失败需同步降级，保证功能不回退，但降级时仍会阻塞主进程。

### 状态

未开始实施。
