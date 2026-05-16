import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => {
    console.log('ping from preload')
  },
})
