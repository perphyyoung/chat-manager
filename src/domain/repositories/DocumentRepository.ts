import type { Document } from "../entities";

export interface DocumentRepository {
  findAllDocuments(): Promise<Document[]>;
  findAllDeletedDocuments(): Promise<Document[]>;
  findDocumentById(id: string): Promise<Document | null>;
  findByTagId(tagId: string): Promise<Document[]>;
  saveDocument(document: Document): Promise<void>;
  softDeleteDocument(id: string): Promise<void>;
  restoreDocument(id: string): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  existsDocument(id: string): Promise<boolean>;

  // 标签相关方法
  addTag(documentId: string, tagId: string): Promise<void>;
  removeTag(documentId: string, tagId: string): Promise<void>;
  getTags(documentId: string): Promise<Array<{ id: string; name: string }>>;

  // 问题软删除相关方法
  permanentlyDeleteQuestion(documentId: string, questionId: string): Promise<void>;
}
