---
name: "py-e2e"
description: "用于 e2e 测试. Invoke when writing e2e test file."
---

# E2E 测试指南

- 测试数据以 e2e 开头, 便于识别和清理; 删除前缀 e2e, 而不是 e2e- 或 e2e_
- 先检查相关实现, 再编写和修改测试代码
- 禁止使用 waitForTimeout, 使用显式的元素等待
- timeout 不要超过 2000 毫秒, 否则需要说明理由

## 日志使用指南

E2E 测试中的日志统一输出到项目根目录 `cm.log`，便于调试。

### E2E 测试文件中的日志

必须使用 `e2e/utils.ts` 中的辅助函数：

```typescript
import { logToFile } from './utils'

// 写入日志
await logToFile(window, 'info', '测试步骤信息')
await logToFile(window, 'error', '错误信息')

```
