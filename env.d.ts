/// <reference types="vite/client" />

interface QuestionDTO {
  id: string;
  text: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: number;
  deletedAt?: string;
}

interface AnswerDTO {
  id: string;
  questionId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface TagDTO {
  id: string;
  name: string;
  createdAt: string;
}

interface DocumentDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  questions: QuestionDTO[];
  answers: AnswerDTO[];
  tags?: TagDTO[];
}

interface ElectronAPI {
  onOpenSettings: (callback: () => void) => void;
  onOpenSearch: (callback: () => void) => void;
  openSearch: () => void;
  logToFile: (level: string, message: string) => void;
  db: {
    findAll: (options?: { isDeleted?: boolean }) => Promise<DocumentDTO[]>;
    findById: (id: string) => Promise<DocumentDTO | null>;
    save: (documentJson: string) => Promise<void>;
    softDelete: (id: string) => Promise<void>;
    restore: (id: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
    exists: (id: string) => Promise<boolean>;
  };
  answer: {
    findByQuestionId: (questionId: string) => Promise<AnswerDTO | null>;
    save: (answerJson: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  question: {
    softDelete: (documentId: string, questionId: string) => Promise<void>;
    restore: (documentId: string, questionId: string) => Promise<void>;
    getDeleted: (
      documentId: string,
    ) => Promise<Array<{ id: string; text: string; deletedAt: string }>>;
    permanentlyDelete: (
      documentId: string,
      questionId: string,
    ) => Promise<void>;
    clearDeleted: (documentId: string) => Promise<void>;
  };
  tag: {
    findAll: () => Promise<TagDTO[]>;
    findById: (id: string) => Promise<TagDTO | null>;
    findByName: (name: string) => Promise<TagDTO | null>;
    save: (tagJson: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
    exists: (name: string) => Promise<boolean>;
    addToDocument: (documentId: string, tagId: string) => Promise<void>;
    removeFromDocument: (documentId: string, tagId: string) => Promise<void>;
    getDocumentTags: (documentId: string) => Promise<TagDTO[]>;
    findDocumentsByTagId: (tagId: string) => Promise<DocumentDTO[]>;
  };
  search: {
    query: (query: string) => Promise<SearchResults>;
    rebuild: () => Promise<void>;
  };
}

interface SearchResults {
  documents: DocumentSearchResult[];
  questions: QuestionSearchResult[];
  answers: AnswerSearchResult[];
  tags: TagSearchResult[];
}

interface DocumentSearchResult {
  id: string;
  title: string;
  questionCount: number;
  answerCount: number;
}

interface QuestionSearchResult {
  id: string;
  text: string;
  snippet?: string;
  documentId: string;
  documentTitle: string;
}

interface AnswerSearchResult {
  id: string;
  content: string;
  snippet?: string;
  questionText: string;
  questionId: string;
  documentId: string;
  documentTitle: string;
}

interface TagSearchResult {
  id: string;
  name: string;
  documentCount: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type { SearchResults, DocumentSearchResult, QuestionSearchResult, AnswerSearchResult, TagSearchResult };
