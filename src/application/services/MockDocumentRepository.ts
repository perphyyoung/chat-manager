import type { DocumentRepository } from "../../domain/repositories";
import { Document } from "../../domain/entities";
import type { DocumentListItem } from "../../types/dto";

export class MockDocumentRepository implements DocumentRepository {
  private documents: Map<string, Document> = new Map();
  private documentTags: Map<string, Set<string>> = new Map();

  async listSummaries(): Promise<DocumentListItem[]> {
    return Array.from(this.documents.values()).map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      questionCount: d.activeQuestions.length,
      tags: d.tags.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt.toISOString(),
      })),
    }));
  }

  async findAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async findAllDeletedDocuments(): Promise<Document[]> {
    return [];
  }

  async findDocumentById(id: string): Promise<Document | null> {
    return this.documents.get(id) ?? null;
  }

  async findByTagId(_tagId: string): Promise<Document[]> {
    return [];
  }

  async saveDocument(document: Document): Promise<void> {
    this.documents.set(document.id, document);
  }

  async softDeleteDocument(_id: string): Promise<void> {}
  async restoreDocument(_id: string): Promise<void> {}

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    this.documentTags.delete(id);
  }

  async existsDocument(id: string): Promise<boolean> {
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
    return Array.from(tagIds).map((id) => ({
      id,
      name: "",
    }));
  }

  async permanentlyDeleteQuestion(_documentId: string, _questionId: string): Promise<void> {}

  clear(): void {
    this.documents.clear();
    this.documentTags.clear();
  }
}
