import type { Question } from "../entities";

export interface QuestionRepository {
  findByDocumentId(documentId: string): Promise<Question[]>;
  findById(id: string): Promise<Question | null>;
  saveAllQuestions(documentId: string, questions: Question[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(ids: string[]): Promise<void>;
}
