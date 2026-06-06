import type { AnswerRepository } from "../../domain/repositories";
import { Answer } from "../../domain/entities";
import type { AnswerDTO } from "@/types/dto";

function toAnswer(dto: AnswerDTO): Answer {
  return new Answer(
    dto.id,
    dto.questionId,
    dto.content,
    new Date(dto.createdAt),
  );
}

export class SqliteAnswerRepository implements AnswerRepository {
  async findAnswerByQuestionId(questionId: string): Promise<Answer | null> {
    const dto = await window.electronAPI.answer.findAnswerByQuestionId(questionId);
    if (!dto) return null;
    return toAnswer(dto);
  }

  async findByDocumentId(documentId: string): Promise<Answer[]> {
    // 需要通过文档 ID 查询所有关联问题的回答
    // 这里通过 IPC 获取文档数据后提取回答
    const doc = await window.electronAPI.db.findById(documentId);
    if (!doc || !doc.answers) return [];
    return doc.answers.map((a: AnswerDTO) => toAnswer(a));
  }

  async saveAnswer(answer: Answer): Promise<void> {
    await window.electronAPI.answer.saveAnswer(JSON.stringify(answer.toJSON()));
  }

  async saveAllAnswers(documentId: string, answers: Answer[]): Promise<void> {
    const answerJsons = answers.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      content: a.content,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
    await window.electronAPI.answer.saveAllAnswers(documentId, answerJsons);
  }

  async deleteAnswer(id: string): Promise<void> {
    await window.electronAPI.answer.deleteAnswer(id);
  }

  async deleteAllAnswers(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await window.electronAPI.answer.deleteAllAnswers(ids);
  }
}
