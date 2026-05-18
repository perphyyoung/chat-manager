import {
  Document,
  Question,
  Conversation,
  Message,
} from "../../domain/entities";
import type {
  DocumentDTO,
  QuestionDTO,
  ConversationDTO,
  MessageDTO,
} from "../../application/dto";

export class DocumentSerializer {
  static toDTO(document: Document): DocumentDTO {
    return document.toJSON();
  }

  static fromDTO(dto: DocumentDTO): Document {
    const questions = dto.questions.map((q) => this.questionFromDTO(q));
    const conversation = this.conversationFromDTO(dto.conversation);
    return new Document(dto.id, dto.title, questions, conversation);
  }

  static toDTOs(documents: Document[]): DocumentDTO[] {
    return documents.map((d) => this.toDTO(d));
  }

  static fromDTOs(dtos: DocumentDTO[]): Document[] {
    return dtos.map((d) => this.fromDTO(d));
  }

  private static questionFromDTO(dto: QuestionDTO): Question {
    return new Question(dto.id, dto.text, dto.order);
  }

  private static conversationFromDTO(dto: ConversationDTO): Conversation {
    const messages = dto.messages.map((m) => this.messageFromDTO(m));
    return new Conversation(dto.id, messages);
  }

  private static messageFromDTO(dto: MessageDTO): Message {
    return new Message(
      dto.id,
      dto.type,
      dto.content,
      dto.questionId,
      dto.createdAt ? new Date(dto.createdAt) : new Date(),
    );
  }
}
