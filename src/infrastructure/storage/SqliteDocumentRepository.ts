import type {
  DocumentRepository,
  QuestionRepository,
  AnswerRepository,
} from "../../domain/repositories";
import { Document, Question, Answer, Tag } from "../../domain/entities";
import type { DocumentDTO } from "../../types/dto";

function toDocument(stored: DocumentDTO): Document {
  // 加载所有问题（包括已删除的），传递软删除状态
  const questions = (stored.questions ?? []).map(
    (q) =>
      new Question(
        q.id,
        q.text,
        q.order,
        new Date(q.createdAt),
        !!q.isDeleted,
        q.deletedAt ? new Date(q.deletedAt) : undefined,
      ),
  );
  const questionIds = new Set(questions.map((q) => q.id));
  const answers = (stored.answers ?? [])
    .filter((a) => questionIds.has(a.questionId))
    .map(
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
    !!stored.deletedAt,
    stored.deletedAt ? new Date(stored.deletedAt) : undefined,
  );
}

export class SqliteDocumentRepository implements DocumentRepository {
  private questionRepo: QuestionRepository;
  private answerRepo: AnswerRepository;

  constructor(
    questionRepo?: QuestionRepository,
    answerRepo?: AnswerRepository,
  ) {
    // 延迟初始化，避免循环依赖
    this.questionRepo = questionRepo!;
    this.answerRepo = answerRepo!;
  }

  setRepositories(
    questionRepo: QuestionRepository,
    answerRepo: AnswerRepository,
  ) {
    this.questionRepo = questionRepo;
    this.answerRepo = answerRepo;
  }

  async findAll(): Promise<Document[]> {
    const stored = await window.electronAPI.db.findAll({
      isDeleted: false,
    });
    return stored.map((d: DocumentDTO) => toDocument(d));
  }

  async findAllDeleted(): Promise<Document[]> {
    const stored = await window.electronAPI.db.findAll({
      isDeleted: true,
    });
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
    // 使用新的事务和实体级 IPC 方法
    const txId = await window.electronAPI.db.transaction.begin();
    try {
      // 1. 保存文档元数据
      await window.electronAPI.db.document.save({
        id: document.id,
        title: document.title,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      });

      // 2. 保存所有问题（包括已删除的）
      await this.questionRepo.saveAllQuestions(document.id, [...document.questions]);

      // 3. 保存所有答案
      await this.answerRepo.saveAllAnswers(document.id, [...document.answers]);

      // 4. 保存标签关联（同步 document_tags 表）
      await this.syncDocumentTags(document.id, [...document.tags]);

      // 5. 提交事务
      await window.electronAPI.db.transaction.commit(txId);
    } catch (error) {
      // 回滚事务
      await window.electronAPI.db.transaction.rollback(txId);
      console.error(
        "[REPO] Failed to save document, transaction rolled back:",
        error,
      );
      throw error;
    }
  }

  private async syncDocumentTags(
    documentId: string,
    tags: Tag[],
  ): Promise<void> {
    // 获取当前文档的标签
    const currentTags =
      (await window.electronAPI.tag?.getDocumentTags(documentId)) || [];
    const currentTagIds = new Set(currentTags.map((t) => t.id));
    const newTagIds = new Set(tags.map((t) => t.id));

    // 添加新标签关联
    for (const tag of tags) {
      if (!currentTagIds.has(tag.id)) {
        await window.electronAPI.tag.addTagToDocument(documentId, tag.id);
      }
    }

    // 移除已删除的标签关联
    for (const tagId of currentTagIds) {
      if (!newTagIds.has(tagId)) {
        await window.electronAPI.tag.removeTagFromDocument(documentId, tagId);
      }
    }
  }

  async softDelete(id: string): Promise<void> {
    await window.electronAPI.db.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await window.electronAPI.db.restore(id);
  }

  async delete(id: string): Promise<void> {
    await window.electronAPI.db.document.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return window.electronAPI.db.exists(id);
  }

  // 问题软删除相关方法
  async softDeleteQuestion(
    documentId: string,
    questionId: string,
  ): Promise<void> {
    await window.electronAPI.question.softDeleteQuestion(documentId, questionId);
  }

  async restoreQuestion(documentId: string, questionId: string): Promise<void> {
    await window.electronAPI.question.restoreQuestion(documentId, questionId);
  }

  async getDeletedQuestions(
    documentId: string,
  ): Promise<Array<{ id: string; text: string; deletedAt: Date }>> {
    const questions =
      (await window.electronAPI.question.getDeletedQuestions(documentId)) || [];
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
    // DDD 规范：先加载实体，调用领域方法删除，再删除数据库记录
    const document = await this.findById(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }
    document.permanentlyDeleteQuestion(questionId);
    // 直接删除数据库记录，不通过 save 方法
    await this.questionRepo.delete(questionId);
    // 保存文档（不含已删除的问题）
    await this.save(document);
  }

  async clearDeletedQuestions(documentId: string): Promise<void> {
    await window.electronAPI.question.clearDeletedQuestions(documentId);
  }

  async moveQuestionToDocument(
    questionId: string,
    targetDocumentId: string,
  ): Promise<void> {
    await window.electronAPI.question.moveQuestionToDocument(
      questionId,
      targetDocumentId,
    );
  }

  // 标签相关方法
  async findByTagId(tagId: string): Promise<Document[]> {
    const stored = await window.electronAPI.tag?.findDocumentsByTagId(tagId);
    if (!stored) return [];
    return stored.map((d: DocumentDTO) => toDocument(d));
  }

  async addTag(documentId: string, tagId: string): Promise<void> {
    await window.electronAPI.tag.addTagToDocument(documentId, tagId);
  }

  async removeTag(documentId: string, tagId: string): Promise<void> {
    await window.electronAPI.tag?.removeTagFromDocument(documentId, tagId);
  }

  async getTags(
    documentId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const tags = await window.electronAPI.tag?.getDocumentTags(documentId);
    return tags || [];
  }
}
