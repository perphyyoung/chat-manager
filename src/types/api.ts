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
  onOpenSearch: (callback: () => void) => void;
  openSearch: () => void;
  renderLog: (level: string, message: string) => void;
  db: {
    findAll: (options?: { isDeleted?: boolean }) => Promise<DocumentDTO[]>;
    findById: (id: string) => Promise<DocumentDTO | null>;
    softDelete: (id: string) => Promise<void>;
    restore: (id: string) => Promise<void>;
    exists: (id: string) => Promise<boolean>;
    transaction: {
      begin: () => Promise<string>;
      commit: (txId: string) => Promise<void>;
      rollback: (txId: string) => Promise<void>;
    };
    document: {
      save: (doc: DocumentInput) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    questions: {
      save: (docId: string, questions: QuestionInput[]) => Promise<void>;
      delete: (ids: string[]) => Promise<void>;
    };
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
    getDeletedQuestions: (
      documentId: string,
    ) => Promise<Array<{ id: string; text: string; deletedAt: string }>>;
    clearDeletedQuestions: (documentId: string) => Promise<void>;
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
}
