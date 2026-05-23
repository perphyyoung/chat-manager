import type { DocumentRepository } from "../../domain/repositories";
import { Document, Question, Answer, Tag } from "../../domain/entities";

interface TagDTO {
  id: string;
  name: string;
  createdAt: string;
}

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
  tags?: TagDTO[];
}

function toDocument(stored: DocumentDTO): Document {
  // 只过滤掉已删除的问题
  const questions = (stored.questions ?? [])
    .filter((q) => !q.isDeleted)
    .map((q) => new Question(q.id, q.text, q.order, new Date(q.createdAt)));
  const answers = (stored.answers ?? []).map(
    (a) => new Answer(a.id, a.questionId, a.content, new Date(a.createdAt)),
  );
  const tags = (stored.tags ?? []).map(
    (t) => new Tag(t.id, t.name, new Date(t.createdAt)),
  );
  return new Document(
    stored.id,
    stored.title,
    questions,
    answers,
    new Date(stored.createdAt),
    new Date(stored.updatedAt),
    tags,
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
    const json = JSON.stringify(document.toJSON());
    console.log(
      "[REPO] Saving document, id:",
      document.id,
      "tags:",
      document.tags.length,
      document.tags.map((t) => t.name),
    );
    await window.electronAPI.db.save(json);
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

  // 问题软删除相关方法
  async softDeleteQuestion(
    documentId: string,
    questionId: string,
  ): Promise<void> {
    await window.electronAPI.question?.softDelete(documentId, questionId);
  }

  async restoreQuestion(documentId: string, questionId: string): Promise<void> {
    await window.electronAPI.question?.restore(documentId, questionId);
  }

  async getDeletedQuestions(
    documentId: string,
  ): Promise<Array<{ id: string; text: string; deletedAt: Date }>> {
    const questions =
      (await window.electronAPI.question?.getDeleted(documentId)) || [];
    return questions.map(
      (q: { id: string; text: string; deletedAt: string }) => ({
        id: q.id,
        text: q.text,
        deletedAt: new Date(q.deletedAt),
      }),
    );
  }

  async permanentlyDeleteQuestion(
    documentId: string,
    questionId: string,
  ): Promise<void> {
    await window.electronAPI.question?.permanentlyDelete(
      documentId,
      questionId,
    );
  }

  async clearDeletedQuestions(documentId: string): Promise<void> {
    await window.electronAPI.question?.clearDeleted(documentId);
  }

  // 标签相关方法
  async findByTagId(tagId: string): Promise<Document[]> {
    const stored = await window.electronAPI.tag?.findDocumentsByTagId(tagId);
    if (!stored) return [];
    return stored.map((d: DocumentDTO) => toDocument(d));
  }

  async addTag(documentId: string, tagId: string): Promise<void> {
    await window.electronAPI.tag?.addToDocument(documentId, tagId);
  }

  async removeTag(documentId: string, tagId: string): Promise<void> {
    await window.electronAPI.tag?.removeFromDocument(documentId, tagId);
  }

  async getTags(
    documentId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const tags = await window.electronAPI.tag?.getDocumentTags(documentId);
    return tags || [];
  }
}
