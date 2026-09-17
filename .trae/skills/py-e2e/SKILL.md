---
name: "py-e2e"
description: "用于 e2e 测试. Invoke when writing e2e test file."
---

# E2E 测试指南

- 测试数据以 e2e 开头, 便于识别和清理; 删除前缀 e2e, 而不是 e2e- 或 e2e_
- 先检查相关实现, 再编写和修改测试代码
- 禁止使用 waitForTimeout, 使用显式的元素等待
- timeout 不要超过 2000 毫秒, 否则需要说明理由
- 测试的生命周期通过 fixture 管理, 测试文件只包含具体测试逻辑
- 不要依赖已有的数据, 自己生成数据, 消除警告
- 禁止延长超时时间尝试通过，添加相关日志排查根因
