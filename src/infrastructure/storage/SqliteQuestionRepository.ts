import type { QuestionRepository } from "@/domain/repositories";
import { Question } from "@/domain/entities";
import type { QuestionDTO } from "@/types/dto";

export class SqliteQuestionRepository implements QuestionRepository {
  async findByDocumentId(documentId: string): Promise<Question[]> {
    const doc = await window.electronAPI.db.findById(documentId);
    if (!doc) return [];
    const rows = doc.questions || [];
    return rows.map((q: unknown) => this.toQuestion(q as QuestionDTO));
  }

  async findById(id: string): Promise<Question | null> {
    const result = await window.electronAPI.db.findById(id);
    if (!result) return null;
    const question = result.questions?.find((q: { id: string }) => q.id === id);
    if (!question) return null;
    return this.toQuestion(question as unknown as QuestionDTO);
  }

  async saveAllQuestions(documentId: string, questions: Question[]): Promise<void> {
    const questionJsons = questions.map((q) => ({
      id: q.id,
      text: q.text,
      order: q.order,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
      isDeleted: q.isDeleted,
      deletedAt: q.deletedAt?.toISOString(),
    }));
    await window.electronAPI.question.saveAllQuestions(documentId, questionJsons);
  }

  async delete(id: string): Promise<void> {
    await window.electronAPI.db.questions.delete([id]);
  }

  async deleteAll(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await window.electronAPI.db.questions.delete(ids);
  }

  private toQuestion(dto: QuestionDTO): Question {
    return new Question(
      dto.id,
      dto.text,
      dto.order,
      new Date(dto.createdAt),
      dto.isDeleted === 1,
      dto.deletedAt ? new Date(dto.deletedAt) : undefined,
    );
  }
}
