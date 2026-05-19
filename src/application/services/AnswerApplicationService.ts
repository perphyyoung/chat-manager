import type { DocumentRepository, AnswerRepository } from "../../domain/repositories";
import type { EventBus } from "../../domain/events/EventBus";
import { Answer } from "../../domain/entities";
import {
  AnswerCreatedEvent,
  AnswerUpdatedEvent,
  AnswerDeletedEvent,
} from "../../domain/events/AnswerEvents";
import { NotFoundError } from "../../domain/errors";

export class AnswerApplicationService {
  constructor(
    private documentRepo: DocumentRepository,
    private answerRepo: AnswerRepository,
    private eventBus: EventBus,
  ) {}

  async addAnswer(
    documentId: string,
    questionId: string,
    content: string,
  ): Promise<Answer> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    if (!document.hasQuestion(questionId)) {
      throw new NotFoundError("Question", questionId);
    }

    // 检查是否已存在回答
    const existingAnswer = document.getAnswerByQuestionId(questionId);
    if (existingAnswer) {
      throw new Error(`Answer already exists for question ${questionId}`);
    }

    const answerId = `a${Date.now()}`;
    const answer = new Answer(answerId, questionId, content);

    document.addAnswer(answer);
    await this.answerRepo.save(answer);
    await this.documentRepo.save(document);

    this.eventBus.emit(new AnswerCreatedEvent(documentId, questionId, answerId));
    return answer;
  }

  async updateAnswer(
    documentId: string,
    answerId: string,
    newContent: string,
  ): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    // 从文档中找到回答
    const answer = document.answers.find(a => a.id === answerId);
    if (!answer) {
      throw new NotFoundError("Answer", answerId);
    }

    answer.editContent(newContent);
    await this.answerRepo.save(answer);
    await this.documentRepo.save(document);

    this.eventBus.emit(new AnswerUpdatedEvent(documentId, answerId));
  }

  async deleteAnswer(documentId: string, answerId: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    document.removeAnswer(answerId);
    await this.answerRepo.delete(answerId);
    await this.documentRepo.save(document);

    this.eventBus.emit(new AnswerDeletedEvent(documentId, answerId));
  }

  async getAnswerByQuestionId(questionId: string): Promise<Answer | null> {
    return this.answerRepo.findByQuestionId(questionId);
  }
}
