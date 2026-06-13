/**
 * ElectronAPI 类型定义
 * 位于 src/types 目录，可被渲染进程和 E2E 测试共享
 */

import type {
  DocumentDTO,
  TagDTO,
  AnswerDTO,
  DocumentInput,
  QuestionInput,
  AnswerInput,
} from "./dto";
import type { ExportResult, ImportResult } from "./importExport";
import type { SearchResults } from "./search";

export interface ElectronAPI {
  onOpenSettings: (callback: () => void) => void;
  onOpenAbout: (callback: () => void) => void;
  onOpenSearch: (callback: () => void) => void;
  openSearch: () => void;
  renderLog: (level: string, message: string) => void;
  getVersions: () => Promise<{
    app: string;
    electron: string;
    node: string;
    chrome: string;
  }>;
  db: {
    transaction: {
      begin: () => Promise<string>;
      commit: (txId: string) => Promise<void>;
      rollback: (txId: string) => Promise<void>;
    };
  };
  document: {
    findAllDocuments: (options?: {
      isDeleted?: boolean;
    }) => Promise<DocumentDTO[]>;
    findDocumentById: (id: string) => Promise<DocumentDTO | null>;
    saveDocument: (doc: DocumentInput) => Promise<void>;
    deleteDocument: (id: string) => Promise<void>;
    softDeleteDocument: (id: string) => Promise<void>;
    restoreDocument: (id: string) => Promise<void>;
    existsDocument: (id: string) => Promise<boolean>;
  };
  answer: {
    findAnswerByQuestionId: (questionId: string) => Promise<AnswerDTO | null>;
    saveAnswer: (answerJson: string) => Promise<void>;
    deleteAnswer: (id: string) => Promise<void>;
    deleteAllAnswers: (ids: string[]) => Promise<void>;
    saveAllAnswers: (docId: string, answers: AnswerInput[]) => Promise<void>;
  };
  question: {
    softDeleteQuestion: (
      documentId: string,
      questionId: string,
    ) => Promise<void>;
    restoreQuestion: (documentId: string, questionId: string) => Promise<void>;
    saveAllQuestions: (
      docId: string,
      questions: QuestionInput[],
    ) => Promise<void>;
    getDeletedQuestions: (
      documentId: string,
    ) => Promise<Array<{ id: string; text: string; deletedAt: string }>>;
    clearDeletedQuestions: (documentId: string) => Promise<void>;
    deleteAllQuestions: (ids: string[]) => Promise<void>;
    moveQuestionToDocument: (
      questionId: string,
      targetDocumentId: string,
    ) => Promise<void>;
  };
  tag: {
    findAllTags: () => Promise<TagDTO[]>;
    findTagById: (id: string) => Promise<TagDTO | null>;
    findTagByName: (name: string) => Promise<TagDTO | null>;
    saveTag: (tagJson: string) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
    existsTag: (name: string) => Promise<boolean>;
    addTagToDocument: (documentId: string, tagId: string) => Promise<void>;
    removeTagFromDocument: (documentId: string, tagId: string) => Promise<void>;
    getDocumentTags: (documentId: string) => Promise<TagDTO[]>;
    findDocumentsByTagId: (tagId: string) => Promise<DocumentDTO[]>;
  };
  search: {
    querySearch: (query: string) => Promise<SearchResults>;
  };
  onExportComplete: (callback: (result: ExportResult) => void) => void;
  onImportComplete: (callback: (result: ImportResult) => void) => void;
  onShowToast: (callback: (message: string) => void) => void;
}
