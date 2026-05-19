/// <reference types="vite/client" />

interface QuestionDTO {
  id: string;
  text: string;
  order: number;
  createdAt: string;
  updatedAt: string;
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
  questions: QuestionDTO[];
  answers: AnswerDTO[];
}

interface ElectronAPI {
  onOpenSettings: (callback: () => void) => void;
  logToFile: (level: string, message: string) => void;
  db: {
    findAll: () => Promise<DocumentDTO[]>;
    findById: (id: string) => Promise<DocumentDTO | null>;
    save: (documentJson: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
    exists: (id: string) => Promise<boolean>;
  };
  answer: {
    findByQuestionId: (questionId: string) => Promise<AnswerDTO | null>;
    save: (answerJson: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
