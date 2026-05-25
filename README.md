# chat-manager

基于 Vue 3 + Vite + Electron 的桌面对话式文档管理应用。

## 功能特性

- **文档管理**：创建、编辑、删除文档，支持按标签筛选
- **问答对**：以聊天气泡形式展示问题和回答
- **标签系统**：为文档添加标签，支持多标签分类
- **全文搜索**：支持中文分词的全文本搜索（Ctrl+F）
- **回收站**：文档和问题软删除机制
- **主题切换**：支持深色/浅色主题

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite + electron-vite
- **桌面应用**: Electron 41.2.0
- **打包工具**: electron-builder
- **状态管理**: Pinia
- **路由**: Vue Router
- **数据库**: Node.js 内置 SQLite (node:sqlite)
- **编辑器**: CodeMirror 6

## 开发

### 环境要求

- Node.js >= 20.19.0 或 >= 22.12.0
- pnpm >= 8.0.0

## 项目设置

### 1. 安装依赖

```sh
pnpm install
```

### 2. 启动开发服务器

```sh
pnpm dev
```

### 构建生产版本

```sh
pnpm release
```

构建并打包为可执行文件（Windows: `.exe`, macOS: `.dmg`, Linux: `.AppImage`）。

## 测试

### 单元测试 (Vitest)

```sh
pnpm test
```

### 端到端测试 (Playwright)

```sh
# 首次运行安装浏览器
npx playwright install

# 运行 E2E 测试（需要先构建）
pnpm build
pnpm e2e
```

### TypeScript 类型检查

```sh
pnpm type-check
```

### 代码检查和格式化

```sh
# 检查并修复代码
pnpm lint

# 格式化代码
pnpm format
```

## 数据目录

应用数据存储在不同位置，取决于运行环境：

### 开发环境

数据存储在项目根目录下：

```
项目根目录/
└── py-data/
    └── chat-manager.db    # SQLite 数据库
```

### 生产环境

数据存储在用户数据目录：

| 操作系统 | 数据路径 |
|----------|----------|
| Windows | `%APPDATA%/Chat Manager/py-data/` |
| macOS | `~/Library/Application Support/Chat Manager/py-data/` |
| Linux | `~/.config/Chat Manager/py-data/` |

### 数据备份与迁移

- **重装应用**：生产环境数据不会丢失（存储在用户目录）
- **清理开发数据**：直接删除 `py-data` 文件夹
- **备份数据**：复制对应环境的 `py-data` 文件夹

## 自定义配置

See [Vite Configuration Reference](https://vite.dev/config/).

## License

GPL-3.0
