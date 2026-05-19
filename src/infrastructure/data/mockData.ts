import { Document, Question, Answer } from "../../domain/entities";

const now = new Date();

export const mockDocuments = [
  new Document(
    "1",
    "项目初始化",
    [
      new Question("q1", "如何创建新项目？", 0, now),
      new Question("q2", "项目需要哪些依赖？", 1, now),
      new Question("q3", "如何配置开发环境？", 2, now),
    ],
    [
      new Answer(
        "a1",
        "q1",
        "使用 pnpm create 命令创建新项目：pnpm create vite@latest my-project --template vue-ts",
        now,
      ),
      new Answer(
        "a2",
        "q2",
        "主要依赖包括：Vue 3, Vite, TypeScript, Pinia, Vue Router。可选：Vitest, Playwright",
        now,
      ),
      new Answer(
        "a3",
        "q3",
        "1. 安装 Node.js >= 20.19.0\n2. 安装 pnpm: npm install -g pnpm\n3. 安装项目依赖: pnpm install\n4. 运行开发服务器: pnpm dev",
        now,
      ),
    ],
    now,
  ),
  new Document(
    "2",
    "组件开发",
    [
      new Question("q4", "如何创建组件？", 0, now),
      new Question("q5", "组件之间如何通信？", 1, now),
    ],
    [
      new Answer(
        "a4",
        "q4",
        "在 src/components 目录下创建 .vue 文件，使用 Vue 3 的 Composition API",
        now,
      ),
      new Answer(
        "a5",
        "q5",
        "可以使用 Props/Emits, Pinia Store, 或 Provide/Inject 进行组件间通信",
        now,
      ),
    ],
    now,
  ),
  new Document(
    "3",
    "状态管理",
    [
      new Question("q6", "为什么使用 Pinia？", 0, now),
      new Question("q7", "如何定义 Store？", 1, now),
    ],
    [
      new Answer(
        "a6",
        "q6",
        "Pinia 是 Vue 官方推荐的状态管理库，比 Vuex 更简单，支持 TypeScript，模块化设计",
        now,
      ),
      new Answer(
        "a7",
        "q7",
        "使用 defineStore 创建 store，支持 Options API 和 Composition API 两种写法",
        now,
      ),
    ],
    now,
  ),
];
