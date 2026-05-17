import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', callback)
  },
})
