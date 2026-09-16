# design.md

本文件沉淀项目的界面/交互设计约定，供后续开发保持一致。

## z-index 层级

### 分层规范

z-index 一律使用语义变量，禁止魔法数字。变量定义于 `src/presentation/assets/main.css` 的 `:root`（浅色与 `.dark` 共用，无需分别覆盖）。

| 变量 | 值 | 语义 | 适用元素 |
| --- | --- | --- | --- |
| `--z-decor` | 1 | 页面内装饰/指示 | 拖拽放置指示条 |
| `--z-editor-internal` | 100 | 编辑器内部浮层 | CodeMirror 搜索面板 |
| `--z-modal` | 1000 | 局部对话框遮罩 | 文档/问答对/设置对话框 |
| `--z-overlay` | 9000 | 全局全屏遮罩 | 搜索/标签/回收站/确认/通知/右键/下拉遮罩 |
| `--z-panel` | 9010 | 浮层面板体（遮罩 + 10） | 下拉菜单体/标签下拉面板/标签 toggle 按钮 |
| `--z-fullscreen-editor` | 9050 | 全屏编辑器 | 回答编辑器 |
| `--z-toast` | 9100 | 全局提示，恒最高 | Toast |

### 组件归属

| 变量 | 组件 | 元素 |
| --- | --- | --- |
| `--z-decor` | QuestionItem.vue | `.question-item--drop-target::before` |
| `--z-editor-internal` | AnswerEditor.vue | `.cm-panels` |
| `--z-modal` | QuestionList.vue / DocumentList.vue / SettingsModal.vue | 对话框遮罩 |
| `--z-overlay` | SearchModal / TagSelector / RecycleBinModal / DropdownMenu / ContextMenu / ConfirmDialog / NotificationModal | 全屏遮罩 |
| `--z-panel` | TagSelector（下拉面板、toggle 按钮容器）/ DropdownMenu（菜单体） | 浮层面板 |
| `--z-fullscreen-editor` | AnswerEditor.vue | `.fullscreen-edit-overlay` |
| `--z-toast` | ToastModal.vue | `.toast` |

### 约定

- 档位间隔 ≥10；同一档内遮罩与面板体相差 10（面板体 = 遮罩 + 10）。
- 新增强浮层只能归入已有档位，禁止新增超大魔法值。
- 面板的触发按钮若需浮于遮罩之上（如标签 toggle 按钮），与面板体同级（`--z-panel`），不得高于面板。
