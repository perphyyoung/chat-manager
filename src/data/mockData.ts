import type { Document } from '../types'

export const mockDocuments: Document[] = [
  {
    id: '1',
    title: '项目初始化',
    questions: [
      { id: 'q1', text: '如何创建新项目？', order: 1 },
      { id: 'q2', text: '项目需要哪些依赖？', order: 2 },
      { id: 'q3', text: '如何配置开发环境？', order: 3 }
    ],
    conversation: {
      id: 'conv1',
      messages: [
        { id: 'm1', type: 'question', content: '如何创建新项目？', questionId: 'q1' },
        { id: 'm2', type: 'answer', content: '使用 pnpm create 命令创建新项目：pnpm create vite@latest my-project --template vue-ts' },
        { id: 'm3', type: 'question', content: '项目需要哪些依赖？', questionId: 'q2' },
        { id: 'm4', type: 'answer', content: '主要依赖包括：Vue 3, Vite, TypeScript, Pinia, Vue Router。可选：Vitest, Playwright' },
        { id: 'm5', type: 'question', content: '如何配置开发环境？', questionId: 'q3' },
        { id: 'm6', type: 'answer', content: '1. 安装 Node.js >= 20.19.0\n2. 安装 pnpm: npm install -g pnpm\n3. 安装项目依赖: pnpm install\n4. 运行开发服务器: pnpm dev' }
      ]
    }
  },
  {
    id: '2',
    title: '组件开发',
    questions: [
      { id: 'q4', text: '如何创建组件？', order: 1 },
      { id: 'q5', text: '组件之间如何通信？', order: 2 }
    ],
    conversation: {
      id: 'conv2',
      messages: [
        { id: 'm7', type: 'question', content: '如何创建组件？', questionId: 'q4' },
        { id: 'm8', type: 'answer', content: '在 src/components 目录下创建 .vue 文件，使用 Vue 3 的 Composition API' },
        { id: 'm9', type: 'question', content: '组件之间如何通信？', questionId: 'q5' },
        { id: 'm10', type: 'answer', content: '可以使用 Props/Emits, Pinia Store, 或 Provide/Inject 进行组件间通信' }
      ]
    }
  },
  {
    id: '3',
    title: '状态管理',
    questions: [
      { id: 'q6', text: '为什么使用 Pinia？', order: 1 },
      { id: 'q7', text: '如何定义 Store？', order: 2 }
    ],
    conversation: {
      id: 'conv3',
      messages: [
        { id: 'm11', type: 'question', content: '为什么使用 Pinia？', questionId: 'q6' },
        { id: 'm12', type: 'answer', content: 'Pinia 是 Vue 官方推荐的状态管理库，比 Vuex 更简单，支持 TypeScript，模块化设计' },
        { id: 'm13', type: 'question', content: '如何定义 Store？', questionId: 'q7' },
        { id: 'm14', type: 'answer', content: '使用 defineStore 创建 store，支持 Options API 和 Composition API 两种写法' }
      ]
    }
  }
]
