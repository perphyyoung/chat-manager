/// <reference types="vite/client" />

interface ElectronAPI {
  onOpenSettings: (callback: () => void) => void;
  logToFile: (level: string, message: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
