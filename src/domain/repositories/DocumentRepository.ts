import type { Document } from "../entities";

export interface DocumentRepository {
  findAll(): Promise<Document[]>;
  findAllDeleted(): Promise<Document[]>;
  findById(id: string): Promise<Document | null>;
  save(document: Document): Promise<void>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;

  // 问题软删除相关方法
  softDeleteQuestion(documentId: string, questionId: string): Promise<void>;
  restoreQuestion(documentId: string, questionId: string): Promise<void>;
  getDeletedQuestions(documentId: string): Promise<Array<{ id: string; text: string; deletedAt: Date }>>;
  permanentlyDeleteQuestion(documentId: string, questionId: string): Promise<void>;
  clearDeletedQuestions(documentId: string): Promise<void>;
}
