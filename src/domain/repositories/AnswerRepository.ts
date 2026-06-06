import type { Answer } from "../entities";

export interface AnswerRepository {
  findByQuestionId(questionId: string): Promise<Answer | null>;
  findByDocumentId(documentId: string): Promise<Answer[]>;
  save(answer: Answer): Promise<void>;
  saveAll(documentId: string, answers: Answer[]): Promise<void>;
  deleteAnswer(id: string): Promise<void>;
  deleteAll(ids: string[]): Promise<void>;
}
