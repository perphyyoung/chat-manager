import type { QuestionRepository } from "@/domain/repositories";
import { Question } from "@/domain/entities";
import type { QuestionDTO } from "@/types/dto";

export class SqliteQuestionRepository implements QuestionRepository {
  async findQuestionByDocumentId(documentId: string): Promise<Question[]> {
    const doc = await window.electronAPI.document.findDocumentById(documentId);
    if (!doc) return [];
    const rows = doc.questions || [];
    return rows.map((q: unknown) => this.toQuestion(q as QuestionDTO));
  }

  async saveAllQuestions(
    documentId: string,
    questions: Question[],
  ): Promise<void> {
    const questionJsons = questions.map((q) => ({
      id: q.id,
      text: q.text,
      order: q.order,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
      isDeleted: q.isDeleted,
      deletedAt: q.deletedAt?.toISOString(),
    }));
    await window.electronAPI.question.saveAllQuestions(
      documentId,
      questionJsons,
    );
  }

  async softDeleteQuestion(
    documentId: string,
    questionId: string,
  ): Promise<void> {
    await window.electronAPI.question.softDeleteQuestion(
      documentId,
      questionId,
    );
  }

  async restoreQuestion(
    documentId: string,
    questionId: string,
  ): Promise<void> {
    await window.electronAPI.question.restoreQuestion(documentId, questionId);
  }

  async getDeletedQuestions(
    documentId: string,
  ): Promise<Array<{ id: string; text: string; deletedAt: Date }>> {
    const questions =
      (await window.electronAPI.question.getDeletedQuestions(documentId)) ||
      [];
    return questions.map(
      (q: { id: string; text: string; deletedAt: string }) => ({
        id: q.id,
        text: q.text,
        deletedAt: new Date(q.deletedAt),
      }),
    );
  }

  async clearDeletedQuestions(documentId: string): Promise<void> {
    await window.electronAPI.question.clearDeletedQuestions(documentId);
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
