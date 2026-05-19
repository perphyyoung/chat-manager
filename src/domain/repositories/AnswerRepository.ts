import type { Answer } from "../entities";

export interface AnswerRepository {
  findByQuestionId(questionId: string): Promise<Answer | null>;
  findByDocumentId(documentId: string): Promise<Answer[]>;
  save(answer: Answer): Promise<void>;
  delete(id: string): Promise<void>;
}
