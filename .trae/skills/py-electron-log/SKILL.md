---
name: "py-electron-log"
description: "用于调试, 统一输出到 cm.log. Invoke when logging in Electron main/renderer process."
---

# Electron Log 使用指南

项目日志**统一输出到项目根目录 `cm.log`**。

## 主进程 (electron/main.ts)

```typescript
import { log } from "./logger";

// 单参数
log.error("错误日志");
log.debug("调试信息");
```

## 渲染进程

通过 IPC 通道写入日志，**第一个参数是日志级别，第二个参数是消息字符串**：

```typescript
// 正确用法 - 两个参数: (level, message)
window.electronAPI.renderLog("error", "错误信息");
window.electronAPI.renderLog("debug", "调试信息");

// 多变量拼接
window.electronAPI.renderLog("info", `[Component] 状态: id=${id}, count=${count}`);
```
