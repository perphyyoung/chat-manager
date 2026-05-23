import type {
  TagRepository,
  DocumentRepository,
} from "../../domain/repositories";
import type { EventBus } from "../../domain/events/EventBus";
import { Tag } from "../../domain/entities";
import { NotFoundError, ValidationError } from "../../domain/errors";

export class TagApplicationService {
  constructor(
    private tagRepo: TagRepository,
    private documentRepo: DocumentRepository,
    private eventBus: EventBus,
  ) {}

  async getAllTags(): Promise<Tag[]> {
    return this.tagRepo.findAll();
  }

  async createTag(name: string): Promise<Tag> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new ValidationError("Tag name cannot be empty");
    }

    const exists = await this.tagRepo.exists(trimmedName);
    if (exists) {
      throw new ValidationError(`Tag "${trimmedName}" already exists`);
    }

    const id = `tag${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tag = new Tag(id, trimmedName);
    await this.tagRepo.save(tag);
    return tag;
  }

  async deleteTag(tagId: string): Promise<void> {
    const tag = await this.tagRepo.findById(tagId);
    if (!tag) {
      throw new NotFoundError("Tag", tagId);
    }

    await this.tagRepo.delete(tagId);
  }

  async updateTagName(tagId: string, newName: string): Promise<Tag> {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      throw new ValidationError("Tag name cannot be empty");
    }

    const tag = await this.tagRepo.findById(tagId);
    if (!tag) {
      throw new NotFoundError("Tag", tagId);
    }

    // 如果名称没有变化，直接返回
    if (tag.name === trimmedName) {
      return tag;
    }

    // 检查新名称是否已存在
    const exists = await this.tagRepo.exists(trimmedName);
    if (exists) {
      throw new ValidationError(`Tag "${trimmedName}" already exists`);
    }

    // 更新标签名
    tag.updateName(trimmedName);
    await this.tagRepo.save(tag);
    console.log("[SERVICE] Tag saved with new name:", tag.id, tag.name);

    // 更新所有关联文档中的标签名
    const documents = await this.documentRepo.findByTagId(tagId);
    console.log("[SERVICE] Found documents with tag:", documents.length);
    for (const doc of documents) {
      console.log(
        "[SERVICE] Updating tag in document:",
        doc.id,
        "current tags:",
        doc.tags.map((t) => ({ id: t.id, name: t.name })),
      );
      doc.updateTagName(tagId, trimmedName);
      console.log(
        "[SERVICE] After update, tags:",
        doc.tags.map((t) => ({ id: t.id, name: t.name })),
      );
      await this.documentRepo.save(doc);
      console.log("[SERVICE] Document saved:", doc.id);
    }

    return tag;
  }

  async addTagToDocument(documentId: string, tagId: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    const tag = await this.tagRepo.findById(tagId);
    if (!tag) {
      throw new NotFoundError("Tag", tagId);
    }

    if (document.hasTag(tagId)) return;

    document.addTag(tag);
    await this.documentRepo.save(document);
  }

  async removeTagFromDocument(
    documentId: string,
    tagId: string,
  ): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    document.removeTag(tagId);
    await this.documentRepo.save(document);
  }

  async getDocumentTags(documentId: string): Promise<Tag[]> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document", documentId);
    }

    return [...document.tags];
  }

  async getDocumentsByTag(
    tagId: string,
  ): Promise<import("../../domain/entities").Document[]> {
    const tag = await this.tagRepo.findById(tagId);
    if (!tag) {
      throw new NotFoundError("Tag", tagId);
    }

    return this.documentRepo.findByTagId(tagId);
  }
}
