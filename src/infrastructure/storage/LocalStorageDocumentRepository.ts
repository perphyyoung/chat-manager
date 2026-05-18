import type { DocumentRepository } from "../../domain/repositories";
import {
  Document,
  Question,
  Conversation,
  Message,
} from "../../domain/entities";

interface StoredDocument {
  id: string;
  title: string;
  questions: { id: string; text: string; order: number }[];
  conversation: {
    id: string;
    messages: {
      id: string;
      type: "question" | "answer";
      content: string;
      questionId?: string;
      createdAt?: string;
      editedAt?: string;
    }[];
  };
}

export class LocalStorageDocumentRepository implements DocumentRepository {
  private readonly STORAGE_KEY = "documents";

  async findAll(): Promise<Document[]> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      const stored: StoredDocument[] = JSON.parse(data);
      return stored.map((d) => this.toDocument(d));
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<Document | null> {
    const documents = await this.findAll();
    return documents.find((d) => d.id === id) ?? null;
  }

  async save(document: Document): Promise<void> {
    const documents = await this.findAll();
    const index = documents.findIndex((d) => d.id === document.id);
    if (index >= 0) {
      documents[index] = document;
    } else {
      documents.push(document);
    }
    await this.saveAll(documents);
  }

  async delete(id: string): Promise<void> {
    const documents = await this.findAll();
    const filtered = documents.filter((d) => d.id !== id);
    await this.saveAll(filtered);
  }

  async exists(id: string): Promise<boolean> {
    const document = await this.findById(id);
    return document !== null;
  }

  private async saveAll(documents: Document[]): Promise<void> {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(documents.map((d) => d.toJSON())),
    );
  }

  private toDocument(stored: StoredDocument): Document {
    const messages = stored.conversation.messages.map(
      (m) =>
        new Message(
          m.id,
          m.type,
          m.content,
          m.questionId,
          m.createdAt ? new Date(m.createdAt) : undefined,
        ),
    );
    const conversation = new Conversation(stored.conversation.id, messages);
    const questions = stored.questions.map(
      (q) => new Question(q.id, q.text, q.order),
    );
    return new Document(stored.id, stored.title, questions, conversation);
  }
}
