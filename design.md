# design.md

本文件沉淀项目的界面/交互设计约定，供后续开发保持一致。

## 目录

| 小节 | 内容 |
| --- | --- |
| [交互](#交互) | 文本编辑聚焦等交互约定 |
| [z-index 层级](#z-index-层级) | 浮层层级的分层规范、组件归属与使用约定 |

## 交互

- 文本编辑时需自动聚焦到文本框：新建或编辑标签/文档/问答对等文本类输入，打开编辑框即自动聚焦，便于直接输入，减少一次点击。
- 置空防护统一为 disabled：新建/编辑类文本输入置空时，提交按钮应 disabled（须提供 disabled 置灰样式，hover 用 `:not(:disabled)` 排除）；若输入框存在 Enter 提交路径，处理函数内仍需保留空值守卫并 toast 提示，作为兜底。
- 含取消按钮的界面，取消按钮置于左侧、主操作按钮置于右侧，两按钮水平均分（各占一半宽度，如 `flex: 1`）。例外：回答编辑界面的按钮组固定在右上角。

## z-index 层级

### 分层规范

z-index 一律使用语义变量，禁止魔法数字。变量定义于 `src/presentation/assets/main.css` 的 `:root`（浅色与 `.dark` 共用，无需分别覆盖）。

| 变量 | 值 | 语义 | 适用元素 |
| --- | --- | --- | --- |
| `--z-decor` | 1 | 页面内装饰/指示 | 拖拽放置指示条 |
| `--z-editor-internal` | 100 | 编辑器内部浮层 | CodeMirror 搜索面板 |
| `--z-modal` | 1000 | 局部对话框遮罩 | 文档/问答对对话框 |
| `--z-overlay` | 9000 | 全局全屏遮罩 | 标签/回收站/确认/通知/下拉遮罩及其面板体 |
| `--z-fullscreen-editor` | 9050 | 全屏编辑器遮罩，高于普通全屏遮罩 | 回答编辑器 |
| `--z-global-search` | 9500 | 全局搜索，高于全屏编辑器 | 全局搜索面板 |
| `--z-settings` | 9600 | 设置弹窗，高于全局搜索与全屏编辑器，便于调整字体等设置时即时预览 | 设置对话框 |
| `--z-highest` | 10000 | 全局提示/右键菜单，恒最高 | Toast / 右键菜单 |

### 组件归属

| 变量 | 组件 | 元素 |
| --- | --- | --- |
| `--z-decor` | QuestionItem.vue | `.question-item--drop-target::before` |
| `--z-fullscreen-editor` | AnswerEditor.vue | `.fullscreen-edit-overlay` |
| `--z-modal` | QuestionList.vue / DocumentList.vue | 对话框遮罩 |
| `--z-overlay` | TagSelector / RecycleBinModal / DropdownMenu / ConfirmDialog / NotificationModal / TagFilter | 全屏遮罩及面板体（面板体为遮罩子元素；TagFilter 独立浮层直接用此层级） |
| `--z-global-search` | SearchModal.vue | 全局搜索面板 |
| `--z-settings` | SettingsModal.vue | 对话框遮罩 |
| `--z-highest` | ContextMenu.vue / ToastModal.vue | `.context-menu-overlay` / `.toast` |

> `--z-editor-internal` 属编辑器内部浮层（AnswerEditor `.cm-panels`），不影响全局层级，故不列入全局归属。

### 约定

- 档位间隔 ≥10；新增强浮层只能归入已有档位，禁止新增超大魔法值。
- 面板体（下拉菜单、标签下拉等）是遮罩的子元素，随遮罩渲染，无需更高层级；独立浮层面板（无遮罩父级）直接使用 `--z-overlay`。
- 面板的关闭入口应放在面板内部，勿让触发按钮浮于遮罩之上。
- 右键菜单的 Teleport 挂载点可能早于其他浮层（如全屏编辑器遮罩），须用 `--z-highest` 保证浮于其上。
