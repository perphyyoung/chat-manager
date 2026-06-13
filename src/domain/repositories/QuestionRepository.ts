import type { Question } from "../entities";

export interface QuestionRepository {
  findQuestionByDocumentId(documentId: string): Promise<Question[]>;
  saveAllQuestions(documentId: string, questions: Question[]): Promise<void>;
  softDeleteQuestion(documentId: string, questionId: string): Promise<void>;
  restoreQuestion(documentId: string, questionId: string): Promise<void>;
  getDeletedQuestions(
    documentId: string,
  ): Promise<Array<{ id: string; text: string; deletedAt: Date }>>;
  clearDeletedQuestions(documentId: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(ids: string[]): Promise<void>;
}
