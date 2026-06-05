import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { SqliteTagRepository } from "./SqliteTagRepository";
import { Tag } from "@/domain/entities";

type MockFn = Mock<(...args: unknown[]) => unknown>;

interface MockElectronAPI {
  tag: {
    findAll: MockFn;
    findById: MockFn;
    findByName: MockFn;
    save: MockFn;
    delete: MockFn;
    existsTag: MockFn;
  };
}

describe("SqliteTagRepository", () => {
  let repository: SqliteTagRepository;
  let mockElectronAPI: MockElectronAPI;

  beforeEach(() => {
    mockElectronAPI = {
      tag: {
        findAll: vi.fn(),
        findById: vi.fn(),
        findByName: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        existsTag: vi.fn(),
      },
    };
    (window as unknown as { electronAPI: MockElectronAPI }).electronAPI =
      mockElectronAPI;
    repository = new SqliteTagRepository();
  });

  describe("findAll", () => {
    it("should return all tags", async () => {
      const tagData = [
        { id: "tag1", name: "Tag 1", createdAt: "2024-01-01T00:00:00Z" },
        { id: "tag2", name: "Tag 2", createdAt: "2024-01-02T00:00:00Z" },
      ];
      mockElectronAPI.tag.findAll.mockResolvedValue(tagData);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe("tag1");
      expect(result[0]?.name).toBe("Tag 1");
      expect(result[1]?.id).toBe("tag2");
      expect(result[1]?.name).toBe("Tag 2");
    });

    it("should return empty array when no tags", async () => {
      mockElectronAPI.tag.findAll.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it("should return empty array when tag API is unavailable", async () => {
      mockElectronAPI.tag.findAll.mockResolvedValue(undefined);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should return tag when found", async () => {
      const tagData = {
        id: "tag1",
        name: "Tag 1",
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockElectronAPI.tag.findById.mockResolvedValue(tagData);

      const result = await repository.findById("tag1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("tag1");
      expect(result?.name).toBe("Tag 1");
    });

    it("should return null when not found", async () => {
      mockElectronAPI.tag.findById.mockResolvedValue(null);

      const result = await repository.findById("tag1");

      expect(result).toBeNull();
    });
  });

  describe("findByName", () => {
    it("should return tag when found", async () => {
      const tagData = {
        id: "tag1",
        name: "Tag 1",
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockElectronAPI.tag.findByName.mockResolvedValue(tagData);

      const result = await repository.findByName("Tag 1");

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Tag 1");
    });

    it("should return null when not found", async () => {
      mockElectronAPI.tag.findByName.mockResolvedValue(null);

      const result = await repository.findByName("Tag 1");

      expect(result).toBeNull();
    });
  });

  describe("save", () => {
    it("should save tag", async () => {
      const tag = new Tag("tag1", "Tag 1");
      mockElectronAPI.tag.save.mockResolvedValue(undefined);

      await repository.save(tag);

      expect(mockElectronAPI.tag.save).toHaveBeenCalledWith(
        JSON.stringify(tag.toJSON()),
      );
    });
  });

  describe("delete", () => {
    it("should delete tag", async () => {
      mockElectronAPI.tag.delete.mockResolvedValue(undefined);

      await repository.delete("tag1");

      expect(mockElectronAPI.tag.delete).toHaveBeenCalledWith("tag1");
    });
  });

  describe("existsTag", () => {
    it("should return true when tag exists", async () => {
      mockElectronAPI.tag.existsTag.mockResolvedValue(true);

      const result = await repository.existsTag("Tag 1");

      expect(result).toBe(true);
      expect(mockElectronAPI.tag.existsTag).toHaveBeenCalledWith("Tag 1");
    });

    it("should return false when tag does not exist", async () => {
      mockElectronAPI.tag.existsTag.mockResolvedValue(false);

      const result = await repository.existsTag("Tag 1");

      expect(result).toBe(false);
    });
  });
});
