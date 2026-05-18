import type { DocumentRepository } from "../../domain/repositories";
import type { EventBus } from "../../domain/events/EventBus";
import { Message } from "../../domain/entities";
import {
  MessageSentEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
} from "../../domain/events/ConversationEvents";
import { NotFoundError } from "../../domain/errors";

export class ConversationApplicationService {
  constructor(
    private documentRepo: DocumentRepository,
    private eventBus: EventBus,
  ) {}

  async sendMessage(
    documentId: string,
    content: string,
    type: "question" | "answer",
    questionId?: string,
  ): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    const messageId = `m${Date.now()}`;
    const message = new Message(messageId, type, content, questionId);

    document.conversation.addMessage(message);
    await this.documentRepo.save(document);

    this.eventBus.emit(new MessageSentEvent(documentId, messageId, type));
  }

  async answerQuestion(
    documentId: string,
    questionId: string,
    answer: string,
  ): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    if (!document.hasQuestion(questionId)) {
      throw new NotFoundError("Question", questionId);
    }

    const messageId = `m${Date.now()}`;
    const message = new Message(messageId, "answer", answer, questionId);

    document.conversation.addMessage(message);
    await this.documentRepo.save(document);

    this.eventBus.emit(new MessageSentEvent(documentId, messageId, "answer"));
  }

  async editMessage(
    documentId: string,
    messageId: string,
    newContent: string,
  ): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    const message = document.conversation.getMessageById(messageId);
    if (!message) {
      throw new NotFoundError("Message", messageId);
    }

    message.editContent(newContent);
    await this.documentRepo.save(document);

    this.eventBus.emit(new MessageEditedEvent(documentId, messageId));
  }

  async deleteMessage(documentId: string, messageId: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    document.conversation.removeMessage(messageId);
    await this.documentRepo.save(document);

    this.eventBus.emit(new MessageDeletedEvent(documentId, messageId));
  }
}
