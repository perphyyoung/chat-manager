/// <reference types="vite/client" />

interface ElectronAPI {
  ping: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
