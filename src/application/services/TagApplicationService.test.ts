import { describe, it, expect, beforeEach } from "vitest";
import { TagApplicationService } from "./TagApplicationService";
import { InMemoryDocumentRepository } from "../../infrastructure/storage/InMemoryDocumentRepository";
import { SimpleEventBus } from "../../domain/events";
import { NotFoundError, ValidationError } from "../../domain/errors";
import type { TagRepository } from "../../domain/repositories";
import { Tag, Document } from "../../domain/entities";

const mockDate = new Date("2025-01-01T00:00:00.000Z");

// Mock TagRepository
class MockTagRepository implements TagRepository {
  private tags: Map<string, Tag> = new Map();

  async findAll(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }

  async findById(id: string): Promise<Tag | null> {
    return this.tags.get(id) ?? null;
  }

  async findByName(name: string): Promise<Tag | null> {
    for (const tag of this.tags.values()) {
      if (tag.name === name) return tag;
    }
    return null;
  }

  async save(tag: Tag): Promise<void> {
    this.tags.set(tag.id, tag);
  }

  async delete(id: string): Promise<void> {
    this.tags.delete(id);
  }

  async exists(name: string): Promise<boolean> {
    for (const tag of this.tags.values()) {
      if (tag.name === name) return true;
    }
    return false;
  }

  clear(): void {
    this.tags.clear();
  }
}

describe("TagApplicationService", () => {
  let service: TagApplicationService;
  let tagRepo: MockTagRepository;
  let documentRepo: InMemoryDocumentRepository;
  let eventBus: SimpleEventBus;

  beforeEach(() => {
    tagRepo = new MockTagRepository();
    documentRepo = new InMemoryDocumentRepository();
    eventBus = new SimpleEventBus();
    service = new TagApplicationService(tagRepo, documentRepo, eventBus);
  });

  describe("getAllTags", () => {
    it("should return empty array when no tags exist", async () => {
      const tags = await service.getAllTags();
      expect(tags).toHaveLength(0);
    });

    it("should return all tags", async () => {
      await service.createTag("Work");
      await service.createTag("Personal");

      const tags = await service.getAllTags();

      expect(tags).toHaveLength(2);
    });
  });

  describe("createTag", () => {
    it("should create a new tag", async () => {
      const tag = await service.createTag("Work");

      expect(tag.name).toBe("Work");
      expect(tag.id).toBeDefined();
    });

    it("should trim tag name", async () => {
      const tag = await service.createTag("  Work  ");

      expect(tag.name).toBe("Work");
    });

    it("should throw error for empty name", async () => {
      await expect(service.createTag("")).rejects.toThrow(ValidationError);
    });

    it("should throw error for whitespace-only name", async () => {
      await expect(service.createTag("   ")).rejects.toThrow(ValidationError);
    });

    it("should throw error for duplicate tag name", async () => {
      await service.createTag("Work");

      await expect(service.createTag("Work")).rejects.toThrow(ValidationError);
    });
  });

  describe("deleteTag", () => {
    it("should delete existing tag", async () => {
      const tag = await service.createTag("Work");

      await service.deleteTag(tag.id);

      const tags = await service.getAllTags();
      expect(tags).toHaveLength(0);
    });

    it("should throw error for non-existent tag", async () => {
      await expect(service.deleteTag("non-existent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("addTagToDocument", () => {
    it("should add tag to document", async () => {
      // Create a document first
      const doc = new Document("doc1", "Test", [], [], mockDate, mockDate, []);
      await documentRepo.save(doc);
      const tag = await service.createTag("Work");

      await service.addTagToDocument("doc1", tag.id);

      const tags = await service.getDocumentTags("doc1");
      expect(tags).toHaveLength(1);
      expect(tags[0]!.name).toBe("Work");
    });

    it("should throw error for non-existent document", async () => {
      const tag = await service.createTag("Work");

      await expect(
        service.addTagToDocument("non-existent", tag.id),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error for non-existent tag", async () => {
      // Create a document first
      const doc = new Document("doc1", "Test", [], [], mockDate, mockDate, []);
      await documentRepo.save(doc);

      await expect(
        service.addTagToDocument("doc1", "non-existent"),
      ).rejects.toThrow(NotFoundError);
    });

    it("should not add duplicate tag to document", async () => {
      // Create a document first
      const doc = new Document("doc1", "Test", [], [], mockDate, mockDate, []);
      await documentRepo.save(doc);
      const tag = await service.createTag("Work");

      await service.addTagToDocument("doc1", tag.id);
      await service.addTagToDocument("doc1", tag.id); // Try to add again

      const tags = await service.getDocumentTags("doc1");
      expect(tags).toHaveLength(1);
    });
  });

  describe("removeTagFromDocument", () => {
    it("should remove tag from document", async () => {
      // Create a document first
      const doc = new Document("doc1", "Test", [], [], mockDate, mockDate, []);
      await documentRepo.save(doc);
      const tag = await service.createTag("Work");
      await service.addTagToDocument("doc1", tag.id);

      await service.removeTagFromDocument("doc1", tag.id);

      const tags = await service.getDocumentTags("doc1");
      expect(tags).toHaveLength(0);
    });

    it("should throw error for non-existent document", async () => {
      await expect(
        service.removeTagFromDocument("non-existent", "tag1"),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error when removing tag not associated with document", async () => {
      // Create a document first
      const doc = new Document("doc1", "Test", [], [], mockDate, mockDate, []);
      await documentRepo.save(doc);
      const tag = await service.createTag("Work");

      await expect(
        service.removeTagFromDocument("doc1", tag.id),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("getDocumentTags", () => {
    it("should return tags for document", async () => {
      // Create a document first
      const doc = new Document("doc1", "Test", [], [], mockDate, mockDate, []);
      await documentRepo.save(doc);
      const tag1 = await service.createTag("Work");
      const tag2 = await service.createTag("Personal");
      await service.addTagToDocument("doc1", tag1.id);
      await service.addTagToDocument("doc1", tag2.id);

      const tags = await service.getDocumentTags("doc1");

      expect(tags).toHaveLength(2);
    });

    it("should throw error for non-existent document", async () => {
      await expect(service.getDocumentTags("non-existent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getDocumentsByTag", () => {
    it("should return documents with tag", async () => {
      const tag = await service.createTag("Work");

      const docs = await service.getDocumentsByTag(tag.id);

      expect(docs).toBeDefined();
    });

    it("should throw error for non-existent tag", async () => {
      await expect(service.getDocumentsByTag("non-existent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
