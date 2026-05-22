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
    findAll: (options?: { isDeleted?: boolean }) => ipcRenderer.invoke("db:findAll", options),
    findById: (id: string) => ipcRenderer.invoke("db:findById", id),
    save: (documentJson: string) => ipcRenderer.invoke("db:save", documentJson),
    softDelete: (id: string) => ipcRenderer.invoke("db:softDelete", id),
    restore: (id: string) => ipcRenderer.invoke("db:restore", id),
    delete: (id: string) => ipcRenderer.invoke("db:delete", id),
    exists: (id: string) => ipcRenderer.invoke("db:exists", id),
  },
  answer: {
    findByQuestionId: (questionId: string) => ipcRenderer.invoke("answer:findByQuestionId", questionId),
    save: (answerJson: string) => ipcRenderer.invoke("answer:save", answerJson),
    delete: (id: string) => ipcRenderer.invoke("answer:delete", id),
  },
  question: {
    softDelete: (documentId: string, questionId: string) => ipcRenderer.invoke("question:softDelete", documentId, questionId),
    restore: (documentId: string, questionId: string) => ipcRenderer.invoke("question:restore", documentId, questionId),
    getDeleted: (documentId: string) => ipcRenderer.invoke("question:getDeleted", documentId),
    permanentlyDelete: (documentId: string, questionId: string) => ipcRenderer.invoke("question:permanentlyDelete", documentId, questionId),
    clearDeleted: (documentId: string) => ipcRenderer.invoke("question:clearDeleted", documentId),
  },
});
