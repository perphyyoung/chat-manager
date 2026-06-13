import type { Answer } from "../entities";

export interface AnswerRepository {
  findAnswerByQuestionId(questionId: string): Promise<Answer | null>;
  findAnswerByDocumentId(documentId: string): Promise<Answer[]>;
  saveAnswer(answer: Answer): Promise<void>;
  saveAllAnswers(documentId: string, answers: Answer[]): Promise<void>;
  deleteAnswer(id: string): Promise<void>;
  deleteAllAnswers(ids: string[]): Promise<void>;
}
