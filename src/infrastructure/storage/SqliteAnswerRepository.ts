import type { AnswerRepository } from "../../domain/repositories";
import { Answer } from "../../domain/entities";

interface AnswerDTO {
  id: string;
  questionId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function toAnswer(dto: AnswerDTO): Answer {
  return new Answer(
    dto.id,
    dto.questionId,
    dto.content,
    new Date(dto.createdAt),
  );
}

export class SqliteAnswerRepository implements AnswerRepository {
  async findByQuestionId(questionId: string): Promise<Answer | null> {
    const dto = await window.electronAPI.answer.findByQuestionId(questionId);
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

  async save(answer: Answer): Promise<void> {
    await window.electronAPI.answer.save(JSON.stringify(answer.toJSON()));
  }

  async delete(id: string): Promise<void> {
    await window.electronAPI.answer.delete(id);
  }
}
