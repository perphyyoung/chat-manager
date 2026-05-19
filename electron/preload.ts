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
  db: {
    findAll: () => ipcRenderer.invoke("db:findAll"),
    findById: (id: string) => ipcRenderer.invoke("db:findById", id),
    save: (documentJson: string) => ipcRenderer.invoke("db:save", documentJson),
    delete: (id: string) => ipcRenderer.invoke("db:delete", id),
    exists: (id: string) => ipcRenderer.invoke("db:exists", id),
  },
  answer: {
    findByQuestionId: (questionId: string) => ipcRenderer.invoke("answer:findByQuestionId", questionId),
    save: (answerJson: string) => ipcRenderer.invoke("answer:save", answerJson),
    delete: (id: string) => ipcRenderer.invoke("answer:delete", id),
  },
});
