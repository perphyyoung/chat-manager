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

interface DocumentDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  questions: QuestionDTO[];
  answers: AnswerDTO[];
}

interface ElectronAPI {
  onOpenSettings: (callback: () => void) => void;
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
    getDeleted: (documentId: string) => Promise<Array<{ id: string; text: string; deletedAt: string }>>;
    permanentlyDelete: (documentId: string, questionId: string) => Promise<void>;
    clearDeleted: (documentId: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
