/// <reference types="vite/client" />

interface ElectronAPI {
  onOpenSettings: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
