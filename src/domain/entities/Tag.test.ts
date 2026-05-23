import { describe, it, expect } from "vitest";
import { Tag } from "./index";
import { ValidationError } from "../errors";

describe("Tag", () => {
  const mockDate = new Date("2025-01-01T00:00:00.000Z");

  describe("constructor", () => {
    it("should create a tag with valid name", () => {
      const tag = new Tag("tag1", "Work", mockDate);

      expect(tag.id).toBe("tag1");
      expect(tag.name).toBe("Work");
      expect(tag.createdAt).toBe(mockDate);
    });

    it("should create tag with default createdAt", () => {
      const before = new Date();
      const tag = new Tag("tag1", "Work");
      const after = new Date();

      expect(tag.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(tag.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should throw error with empty name", () => {
      expect(() => new Tag("tag1", "", mockDate)).toThrow(ValidationError);
    });

    it("should throw error with whitespace-only name", () => {
      expect(() => new Tag("tag1", "   ", mockDate)).toThrow(ValidationError);
    });

    it("should allow name with exactly 20 characters", () => {
      const exactName = "a".repeat(20);
      const tag = new Tag("tag1", exactName, mockDate);
      expect(tag.name).toBe(exactName);
    });
  });

  describe("updateName", () => {
    it("should update name successfully", () => {
      const tag = new Tag("tag1", "Work", mockDate);

      tag.updateName("Personal");

      expect(tag.name).toBe("Personal");
    });

    it("should throw error when updating to empty name", () => {
      const tag = new Tag("tag1", "Work", mockDate);

      expect(() => tag.updateName("")).toThrow(ValidationError);
    });
  });

  describe("toJSON", () => {
    it("should serialize tag correctly", () => {
      const tag = new Tag("tag1", "Work", mockDate);

      const json = tag.toJSON();

      expect(json).toEqual({
        id: "tag1",
        name: "Work",
        createdAt: mockDate.toISOString(),
      });
    });
  });
});
