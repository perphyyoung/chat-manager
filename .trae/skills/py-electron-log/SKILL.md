---
name: "py-electron-log"
description: "用于调试, 统一输出到 cm.log. Invoke when logging in Electron main/renderer process."
---

# Electron Log 使用指南

项目使用 `electron-log` 记录日志，**统一输出到项目根目录 `cm.log`**。

## 主进程 (electron/main.ts)

```typescript
import logger from "electron-log";

// 配置日志路径
logger.transports.file.resolvePathFn = () => path.join(process.cwd(), "cm.log");

// 使用 - 第一个参数是消息字符串
logger.info("信息日志");
logger.error("错误日志: " + error.message);
logger.debug("调试信息: " + JSON.stringify(data));
```

## 渲染进程

通过 IPC 通道写入日志，**第一个参数是日志级别，第二个参数是消息字符串**：

```typescript
// 正确用法 - 两个参数: (level, message)
window.electronAPI.logToFile("info", "日志内容");
window.electronAPI.logToFile("error", "错误: " + error.message);
window.electronAPI.logToFile("debug", "调试: " + JSON.stringify(obj));

// 多变量拼接
window.electronAPI.logToFile("info", `[Component] 状态: id=${id}, count=${count}`);
```
