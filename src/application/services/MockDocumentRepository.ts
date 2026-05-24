import type { DocumentRepository } from "../../domain/repositories";
import { Document } from "../../domain/entities";

export class MockDocumentRepository implements DocumentRepository {
  private documents: Map<string, Document> = new Map();
  private documentTags: Map<string, Set<string>> = new Map();

  async findAll(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async findAllDeleted(): Promise<Document[]> {
    return [];
  }

  async findById(id: string): Promise<Document | null> {
    return this.documents.get(id) ?? null;
  }

  async findByTagId(_tagId: string): Promise<Document[]> {
    return [];
  }

  async save(document: Document): Promise<void> {
    this.documents.set(document.id, document);
  }

  async softDelete(_id: string): Promise<void> {}
  async restore(_id: string): Promise<void> {}

  async delete(id: string): Promise<void> {
    this.documents.delete(id);
    this.documentTags.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.documents.has(id);
  }

  async addTag(documentId: string, tagId: string): Promise<void> {
    if (!this.documentTags.has(documentId)) {
      this.documentTags.set(documentId, new Set());
    }
    this.documentTags.get(documentId)!.add(tagId);
  }

  async removeTag(documentId: string, tagId: string): Promise<void> {
    this.documentTags.get(documentId)?.delete(tagId);
  }

  async getTags(documentId: string): Promise<Array<{ id: string; name: string }>> {
    const tagIds = this.documentTags.get(documentId) || new Set();
    return Array.from(tagIds).map((id) => ({ id, name: "" }));
  }

  async softDeleteQuestion(_documentId: string, _questionId: string): Promise<void> {}
  async restoreQuestion(_documentId: string, _questionId: string): Promise<void> {}
  async getDeletedQuestions(_documentId: string): Promise<Array<{ id: string; text: string; deletedAt: Date }>> {
    return [];
  }
  async permanentlyDeleteQuestion(_documentId: string, _questionId: string): Promise<void> {}
  async clearDeletedQuestions(_documentId: string): Promise<void> {}

  clear(): void {
    this.documents.clear();
    this.documentTags.clear();
  }
}
