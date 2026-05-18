import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on("open-settings", () => {
      callback();
    });
  },
  logToFile: (level: string, message: string) => {
    ipcRenderer.invoke("log-to-file", level, message);
  },
});
