import type { DocumentRepository } from "../../domain/repositories";
import { Document, Question, Answer } from "../../domain/entities";

interface QuestionDTO {
  id: string;
  text: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: number;
  deletedAt?: string;
}

interface AnswerDTO {
  id: string;
  questionId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  questions: QuestionDTO[];
  answers: AnswerDTO[];
}

function toDocument(stored: DocumentDTO): Document {
  // 只过滤掉已删除的问题
  const questions = (stored.questions ?? [])
    .filter((q) => !q.isDeleted)
    .map(
      (q) => new Question(q.id, q.text, q.order, new Date(q.createdAt)),
    );
  const answers = (stored.answers ?? []).map(
    (a) => new Answer(a.id, a.questionId, a.content, new Date(a.createdAt)),
  );
  return new Document(
    stored.id,
    stored.title,
    questions,
    answers,
    new Date(stored.createdAt),
    new Date(stored.updatedAt),
  );
}

export class SqliteDocumentRepository implements DocumentRepository {
  async findAll(): Promise<Document[]> {
    const stored = await window.electronAPI.db.findAll({ isDeleted: false });
    return stored.map((d: DocumentDTO) => toDocument(d));
  }

  async findAllDeleted(): Promise<Document[]> {
    const stored = await window.electronAPI.db.findAll({ isDeleted: true });
    return stored.map((d: DocumentDTO) => toDocument(d));
  }

  async findById(id: string): Promise<Document | null> {
    const stored = await window.electronAPI.db.findById(id);
    if (!stored) {
      return null;
    }
    return toDocument(stored as DocumentDTO);
  }

  async save(document: Document): Promise<void> {
    await window.electronAPI.db.save(JSON.stringify(document.toJSON()));
  }

  async softDelete(id: string): Promise<void> {
    await window.electronAPI.db.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await window.electronAPI.db.restore(id);
  }

  async delete(id: string): Promise<void> {
    await window.electronAPI.db.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return window.electronAPI.db.exists(id);
  }
}
