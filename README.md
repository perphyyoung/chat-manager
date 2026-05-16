# chat-manager

基于 Vue 3 + Vite + Electron 的桌面对话式文档管理应用。

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite + electron-vite
- **桌面应用**: Electron 42
- **打包工具**: electron-builder
- **状态管理**: Pinia
- **路由**: Vue Router

## 开发

### 环境要求

- Node.js >= 20.19.0 或 >= 22.12.0
- pnpm >= 8.0.0

## 项目设置

```sh
pnpm install
```

### Electron 开发模式

```sh
pnpm dev
```

启动 Electron 应用并开启热重载。

### 构建生产版本

```sh
pnpm build
```

构建并打包为可执行文件（Windows: `.exe`, macOS: `.dmg`, Linux: `.AppImage`）。

### 预览构建结果

```sh
pnpm preview
```

构建后预览 Electron 应用。

### 构建为目录形式

```sh
pnpm build:dir
```

构建但不打包，适合调试。

## 测试

### 单元测试 (Vitest)

```sh
pnpm test:unit
```

### 端到端测试 (Playwright)

```sh
# 首次运行安装浏览器
npx playwright install

# 运行 E2E 测试（需要先构建）
pnpm build
pnpm test:e2e
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

## 自定义配置

See [Vite Configuration Reference](https://vite.dev/config/).
