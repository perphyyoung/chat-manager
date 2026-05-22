import type { DocumentRepository } from "../../domain/repositories";
import type { Document } from "../../domain/entities";

interface StoredDocument {
  document: Document;
  isDeleted: boolean;
  deletedAt?: Date;
}

export class InMemoryDocumentRepository implements DocumentRepository {
  private documents: Map<string, StoredDocument> = new Map();

  async findAll(): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter((item) => !item.isDeleted)
      .map((item) => item.document);
  }

  async findAllDeleted(): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter((item) => item.isDeleted)
      .map((item) => item.document);
  }

  async findById(id: string): Promise<Document | null> {
    const item = this.documents.get(id);
    if (!item || item.isDeleted) {
      return null;
    }
    return item.document;
  }

  async save(document: Document): Promise<void> {
    const existing = this.documents.get(document.id);
    this.documents.set(document.id, {
      document,
      isDeleted: existing?.isDeleted ?? false,
      deletedAt: existing?.deletedAt,
    });
  }

  async softDelete(id: string): Promise<void> {
    const item = this.documents.get(id);
    if (item) {
      item.isDeleted = true;
      item.deletedAt = new Date();
    }
  }

  async restore(id: string): Promise<void> {
    const item = this.documents.get(id);
    if (item) {
      item.isDeleted = false;
      item.deletedAt = undefined;
    }
  }

  async delete(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const item = this.documents.get(id);
    return item !== undefined && !item.isDeleted;
  }

  clear(): void {
    this.documents.clear();
  }
}
