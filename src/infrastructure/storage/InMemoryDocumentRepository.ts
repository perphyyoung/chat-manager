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

  // 问题软删除相关方法（内存存储仅作占位实现）
  async softDeleteQuestion(_documentId: string, _questionId: string): Promise<void> {
    // 内存存储不实现问题级软删除，直接返回
    return;
  }

  async restoreQuestion(_documentId: string, _questionId: string): Promise<void> {
    // 内存存储不实现问题级恢复，直接返回
    return;
  }

  async getDeletedQuestions(_documentId: string): Promise<Array<{ id: string; text: string; deletedAt: Date }>> {
    // 内存存储返回空数组
    return [];
  }

  async permanentlyDeleteQuestion(_documentId: string, _questionId: string): Promise<void> {
    // 内存存储不实现问题级永久删除，直接返回
    return;
  }

  async clearDeletedQuestions(_documentId: string): Promise<void> {
    // 内存存储不实现清空回收站，直接返回
    return;
  }
}
