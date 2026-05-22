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
}
