import type { DocumentRepository } from "../../domain/repositories";
import type { Document } from "../../domain/entities";
import type { DocumentDTO } from "../../application/dto";
import { DocumentSerializer } from "../persistence/DocumentSerializer";

export class LocalStorageDocumentRepository implements DocumentRepository {
  private readonly STORAGE_KEY = "documents";

  async findAll(): Promise<Document[]> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      const dtos: DocumentDTO[] = JSON.parse(data);
      return DocumentSerializer.fromDTOs(dtos);
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
    const dtos = DocumentSerializer.toDTOs(documents);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dtos));
  }
}
