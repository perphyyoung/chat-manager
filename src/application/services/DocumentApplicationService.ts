import type { DocumentRepository } from "../../domain/repositories";
import type { EventBus } from "../../domain/events/EventBus";
import { Document, Conversation } from "../../domain/entities";
import {
  DocumentSelectedEvent,
  DocumentsLoadedEvent,
  DocumentCreatedEvent,
  DocumentUpdatedEvent,
  DocumentDeletedEvent,
} from "../../domain/events/DocumentEvents";
import {
  QuestionAddedEvent,
  QuestionActivatedEvent,
} from "../../domain/events/QuestionEvents";
import { NotFoundError } from "../../domain/errors";

export class DocumentApplicationService {
  constructor(
    private documentRepo: DocumentRepository,
    private eventBus: EventBus,
  ) {}

  async loadAllDocuments(): Promise<Document[]> {
    const documents = await this.documentRepo.findAll();
    this.eventBus.emit(
      new DocumentsLoadedEvent(
        documents.map((d) => ({ id: d.id, title: d.title })),
      ),
    );
    return documents;
  }

  async selectDocument(documentId: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }
    this.eventBus.emit(new DocumentSelectedEvent(documentId));
  }

  async createDocument(
    title: string,
    questionTexts: string[] = [],
  ): Promise<Document> {
    const id = `doc${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const conversation = new Conversation(
      `conv${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    );
    const document = new Document(id, title, [], conversation);

    for (const text of questionTexts) {
      document.addQuestion(text);
    }

    await this.documentRepo.save(document);
    this.eventBus.emit(new DocumentCreatedEvent(id, title));
    return document;
  }

  async updateDocumentTitle(
    documentId: string,
    newTitle: string,
  ): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    document.updateTitle(newTitle);
    await this.documentRepo.save(document);
    this.eventBus.emit(
      new DocumentUpdatedEvent(documentId, { title: newTitle }),
    );
  }

  async deleteDocument(documentId: string): Promise<void> {
    const exists = await this.documentRepo.exists(documentId);
    if (!exists) {
      throw new NotFoundError("Document", documentId);
    }

    await this.documentRepo.delete(documentId);
    this.eventBus.emit(new DocumentDeletedEvent(documentId));
  }

  async addQuestion(documentId: string, questionText: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    const question = document.addQuestion(questionText);
    await this.documentRepo.save(document);
    this.eventBus.emit(
      new QuestionAddedEvent(documentId, {
        id: question.id,
        text: question.text,
        order: question.order,
      }),
    );
  }

  async selectQuestion(documentId: string, questionId: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    if (!document.hasQuestion(questionId)) {
      throw new NotFoundError("Question", questionId);
    }

    this.eventBus.emit(new QuestionActivatedEvent(documentId, questionId));
  }

  async getDocument(documentId: string): Promise<Document | null> {
    return this.documentRepo.findById(documentId);
  }
}
