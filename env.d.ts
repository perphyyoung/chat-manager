/// <reference types="vite/client" />
/// <reference types="./src/types/dto" />
/// <reference types="./src/types/search" />
/// <reference types="./src/types/api" />

// DTO、Search 和 API 类型从 src/types 目录导入
// 使用三斜线指令引用，避免重复定义

declare global {
  interface Window {
    electronAPI: import("./src/types/api").ElectronAPI;
  }
}

// 需要至少一个 export 使文件成为模块，同时保持全局声明有效
export type {};
