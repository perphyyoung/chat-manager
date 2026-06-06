import type { Answer } from "../entities";

export interface AnswerRepository {
  findAnswerByQuestionId(questionId: string): Promise<Answer | null>;
  findByDocumentId(documentId: string): Promise<Answer[]>;
  saveAnswer(answer: Answer): Promise<void>;
  saveAll(documentId: string, answers: Answer[]): Promise<void>;
  deleteAnswer(id: string): Promise<void>;
  deleteAllAnswers(ids: string[]): Promise<void>;
}
