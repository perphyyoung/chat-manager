import { contextBridge, ipcRenderer } from "electron";
import type {
  DocumentInput,
  QuestionInput,
  AnswerInput,
} from "../src/types/dto";
import type { ExportResult, ImportResult } from "../src/types/importExport";

contextBridge.exposeInMainWorld("electronAPI", {
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on("open-settings", () => {
      callback();
    });
  },
  onOpenSearch: (callback: () => void) => {
    ipcRenderer.on("shortcut:open-search", () => {
      callback();
    });
  },
  openSearch: () => {
    ipcRenderer.send("shortcut:open-search");
  },
  renderLog: (level: string, message: string) => {
    ipcRenderer.invoke("render-log", level, message);
  },
  db: {
    findAll: (options?: { isDeleted?: boolean }) =>
      ipcRenderer.invoke("db:findAll", options),
    findById: (id: string) => ipcRenderer.invoke("db:findById", id),
    softDelete: (id: string) => ipcRenderer.invoke("db:softDelete", id),
    restore: (id: string) => ipcRenderer.invoke("db:restore", id),
    exists: (id: string) => ipcRenderer.invoke("db:exists", id),
    transaction: {
      begin: () => ipcRenderer.invoke("db:transaction:begin"),
      commit: (txId: string) =>
        ipcRenderer.invoke("db:transaction:commit", txId),
      rollback: (txId: string) =>
        ipcRenderer.invoke("db:transaction:rollback", txId),
    },
    document: {
      save: (doc: DocumentInput) => ipcRenderer.invoke("db:document:save", doc),
      delete: (id: string) => ipcRenderer.invoke("db:document:delete", id),
    },
    questions: {
      save: (docId: string, questions: QuestionInput[]) =>
        ipcRenderer.invoke("db:questions:save", docId, questions),
      delete: (ids: string[]) => ipcRenderer.invoke("db:questions:delete", ids),
    },
    answers: {
      save: (docId: string, answers: AnswerInput[]) =>
        ipcRenderer.invoke("db:answers:save", docId, answers),
      delete: (ids: string[]) => ipcRenderer.invoke("db:answers:delete", ids),
    },
  },
  answer: {
    findByQuestionId: (questionId: string) =>
      ipcRenderer.invoke("answer:findByQuestionId", questionId),
    save: (answerJson: string) => ipcRenderer.invoke("answer:save", answerJson),
    delete: (id: string) => ipcRenderer.invoke("answer:delete", id),
  },
  question: {
    softDelete: (documentId: string, questionId: string) =>
      ipcRenderer.invoke("question:softDelete", documentId, questionId),
    restore: (documentId: string, questionId: string) =>
      ipcRenderer.invoke("question:restore", documentId, questionId),
    getDeleted: (documentId: string) =>
      ipcRenderer.invoke("question:getDeleted", documentId),
    permanentlyDelete: (documentId: string, questionId: string) =>
      ipcRenderer.invoke("question:permanentlyDelete", documentId, questionId),
    clearDeleted: (documentId: string) =>
      ipcRenderer.invoke("question:clearDeleted", documentId),
  },
  tag: {
    findAll: () => ipcRenderer.invoke("tag:findAll"),
    findById: (id: string) => ipcRenderer.invoke("tag:findById", id),
    findByName: (name: string) => ipcRenderer.invoke("tag:findByName", name),
    save: (tagJson: string) => ipcRenderer.invoke("tag:save", tagJson),
    delete: (id: string) => ipcRenderer.invoke("tag:delete", id),
    exists: (name: string) => ipcRenderer.invoke("tag:exists", name),
    addToDocument: (documentId: string, tagId: string) =>
      ipcRenderer.invoke("tag:addToDocument", documentId, tagId),
    removeFromDocument: (documentId: string, tagId: string) =>
      ipcRenderer.invoke("tag:removeFromDocument", documentId, tagId),
    getDocumentTags: (documentId: string) =>
      ipcRenderer.invoke("tag:getDocumentTags", documentId),
    findDocumentsByTagId: (tagId: string) =>
      ipcRenderer.invoke("tag:findDocumentsByTagId", tagId),
  },
  search: {
    query: (query: string) => ipcRenderer.invoke("search:query", query),
    rebuild: () => ipcRenderer.invoke("search:rebuild"),
  },
  onExportComplete: (callback: (result: ExportResult) => void) => {
    ipcRenderer.on("export-complete", (_, result) => callback(result));
  },
  onImportComplete: (callback: (result: ImportResult) => void) => {
    ipcRenderer.on("import-complete", (_, result) => callback(result));
  },
});
