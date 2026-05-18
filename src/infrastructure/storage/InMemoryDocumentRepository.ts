import type { DocumentRepository } from "../../domain/repositories";
import type { Document } from "../../domain/entities";

export class InMemoryDocumentRepository implements DocumentRepository {
  private documents: Map<string, Document> = new Map();

  async findAll(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async findById(id: string): Promise<Document | null> {
    return this.documents.get(id) ?? null;
  }

  async save(document: Document): Promise<void> {
    this.documents.set(document.id, document);
  }

  async delete(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.documents.has(id);
  }

  clear(): void {
    this.documents.clear();
  }
}
