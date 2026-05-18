import {
  Document,
  Question,
  Conversation,
  Message,
} from "../../domain/entities";

export const mockDocuments = [
  new Document(
    "1",
    "项目初始化",
    [
      new Question("q1", "如何创建新项目？", 1),
      new Question("q2", "项目需要哪些依赖？", 2),
      new Question("q3", "如何配置开发环境？", 3),
    ],
    new Conversation("conv1", [
      new Message("m1", "question", "如何创建新项目？", "q1"),
      new Message(
        "m2",
        "answer",
        "使用 pnpm create 命令创建新项目：pnpm create vite@latest my-project --template vue-ts",
        "q1",
      ),
      new Message("m3", "question", "项目需要哪些依赖？", "q2"),
      new Message(
        "m4",
        "answer",
        "主要依赖包括：Vue 3, Vite, TypeScript, Pinia, Vue Router。可选：Vitest, Playwright",
        "q2",
      ),
      new Message("m5", "question", "如何配置开发环境？", "q3"),
      new Message(
        "m6",
        "answer",
        "1. 安装 Node.js >= 20.19.0\n2. 安装 pnpm: npm install -g pnpm\n3. 安装项目依赖: pnpm install\n4. 运行开发服务器: pnpm dev",
        "q3",
      ),
    ]),
  ),
  new Document(
    "2",
    "组件开发",
    [
      new Question("q4", "如何创建组件？", 1),
      new Question("q5", "组件之间如何通信？", 2),
    ],
    new Conversation("conv2", [
      new Message("m7", "question", "如何创建组件？", "q4"),
      new Message(
        "m8",
        "answer",
        "在 src/components 目录下创建 .vue 文件，使用 Vue 3 的 Composition API",
        "q4",
      ),
      new Message("m9", "question", "组件之间如何通信？", "q5"),
      new Message(
        "m10",
        "answer",
        "可以使用 Props/Emits, Pinia Store, 或 Provide/Inject 进行组件间通信",
        "q5",
      ),
    ]),
  ),
  new Document(
    "3",
    "状态管理",
    [
      new Question("q6", "为什么使用 Pinia？", 1),
      new Question("q7", "如何定义 Store？", 2),
    ],
    new Conversation("conv3", [
      new Message("m11", "question", "为什么使用 Pinia？", "q6"),
      new Message(
        "m12",
        "answer",
        "Pinia 是 Vue 官方推荐的状态管理库，比 Vuex 更简单，支持 TypeScript，模块化设计",
        "q6",
      ),
      new Message("m13", "question", "如何定义 Store？", "q7"),
      new Message(
        "m14",
        "answer",
        "使用 defineStore 创建 store，支持 Options API 和 Composition API 两种写法",
        "q7",
      ),
    ]),
  ),
];
