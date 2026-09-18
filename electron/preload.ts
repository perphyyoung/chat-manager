import { contextBridge, ipcRenderer } from "electron";
import type { DocumentInput, QuestionInput, AnswerInput } from "../src/types/dto";
import type { ExportResult, ImportResult } from "../src/types/importExport";

contextBridge.exposeInMainWorld("electronAPI", {
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on("open-settings", () => {
      callback();
    });
  },
  getVersion: () => ipcRenderer.invoke("get-version"),
  getDataPath: () => ipcRenderer.invoke("get-data-path"),
  getFontFamilyMap: () => ipcRenderer.invoke("read-font-family-map"),
  openDataDir: () => ipcRenderer.invoke("open-data-dir"),
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
    transaction: {
      begin: () => ipcRenderer.invoke("db:transaction:begin"),
      commit: (txId: string) => ipcRenderer.invoke("db:transaction:commit", txId),
      rollback: (txId: string) => ipcRenderer.invoke("db:transaction:rollback", txId),
    },
  },
  document: {
    findAllDocuments: (options?: { isDeleted?: boolean }) =>
      ipcRenderer.invoke("document:findAllDocuments", options),
    findDocumentById: (id: string) => ipcRenderer.invoke("document:findDocumentById", id),
    saveDocument: (doc: DocumentInput) => ipcRenderer.invoke("document:saveDocument", doc),
    deleteDocument: (id: string) => ipcRenderer.invoke("document:deleteDocument", id),
    softDeleteDocument: (id: string) => ipcRenderer.invoke("document:softDeleteDocument", id),
    restoreDocument: (id: string) => ipcRenderer.invoke("document:restoreDocument", id),
    existsDocument: (id: string) => ipcRenderer.invoke("document:existsDocument", id),
  },
  answer: {
    findAnswerByQuestionId: (questionId: string) =>
      ipcRenderer.invoke("answer:findAnswerByQuestionId", questionId),
    saveAnswer: (answerJson: string) => ipcRenderer.invoke("answer:saveAnswer", answerJson),
    deleteAnswer: (id: string) => ipcRenderer.invoke("answer:deleteAnswer", id),
    deleteAllAnswers: (ids: string[]) => ipcRenderer.invoke("answer:deleteAllAnswers", ids),
    saveAllAnswers: (docId: string, answers: AnswerInput[]) =>
      ipcRenderer.invoke("answer:saveAllAnswers", docId, answers),
  },
  question: {
    softDeleteQuestion: (documentId: string, questionId: string) =>
      ipcRenderer.invoke("question:softDeleteQuestion", documentId, questionId),
    restoreQuestion: (documentId: string, questionId: string) =>
      ipcRenderer.invoke("question:restoreQuestion", documentId, questionId),
    saveAllQuestions: (docId: string, questions: QuestionInput[]) =>
      ipcRenderer.invoke("question:saveAllQuestions", docId, questions),
    getDeletedQuestions: (documentId: string) =>
      ipcRenderer.invoke("question:getDeletedQuestions", documentId),
    clearDeletedQuestions: (documentId: string) =>
      ipcRenderer.invoke("question:clearDeletedQuestions", documentId),
    deleteAllQuestions: (ids: string[]) => ipcRenderer.invoke("question:deleteAllQuestions", ids),
    moveQuestionToDocument: (questionId: string, targetDocumentId: string) =>
      ipcRenderer.invoke("question:moveQuestionToDocument", questionId, targetDocumentId),
  },
  tag: {
    findAllTags: () => ipcRenderer.invoke("tag:findAllTags"),
    findTagById: (id: string) => ipcRenderer.invoke("tag:findTagById", id),
    findTagByName: (name: string) => ipcRenderer.invoke("tag:findTagByName", name),
    saveTag: (tagJson: string) => ipcRenderer.invoke("tag:saveTag", tagJson),
    deleteTag: (id: string) => ipcRenderer.invoke("tag:deleteTag", id),
    existsTag: (name: string) => ipcRenderer.invoke("tag:existsTag", name),
    addTagToDocument: (documentId: string, tagId: string) =>
      ipcRenderer.invoke("tag:addTagToDocument", documentId, tagId),
    removeTagFromDocument: (documentId: string, tagId: string) =>
      ipcRenderer.invoke("tag:removeTagFromDocument", documentId, tagId),
    getDocumentTags: (documentId: string) => ipcRenderer.invoke("tag:getDocumentTags", documentId),
    findDocumentsByTagId: (tagId: string) => ipcRenderer.invoke("tag:findDocumentsByTagId", tagId),
  },
  search: {
    querySearch: (query: string) => ipcRenderer.invoke("search:querySearch", query),
  },
  onExportComplete: (callback: (result: ExportResult) => void) => {
    ipcRenderer.on("export-complete", (_, result) => callback(result));
  },
  onImportComplete: (callback: (result: ImportResult) => void) => {
    ipcRenderer.on("import-complete", (_, result) => callback(result));
  },
  onShowToast: (callback: (message: string) => void) => {
    ipcRenderer.on("show-toast", (_, message) => callback(message));
  },
});
