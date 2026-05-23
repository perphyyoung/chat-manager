import type { TagRepository } from "../../domain/repositories";
import { Tag } from "../../domain/entities";

interface TagData {
  id: string;
  name: string;
  createdAt: string;
}

function toTag(dto: TagData): Tag {
  return new Tag(dto.id, dto.name, new Date(dto.createdAt));
}

export class SqliteTagRepository implements TagRepository {
  async findAll(): Promise<Tag[]> {
    const rows = await window.electronAPI.tag?.findAll();
    if (!rows) return [];
    return rows.map((r: TagData) => toTag(r));
  }

  async findById(id: string): Promise<Tag | null> {
    const row = await window.electronAPI.tag?.findById(id);
    if (!row) return null;
    return toTag(row);
  }

  async findByName(name: string): Promise<Tag | null> {
    const row = await window.electronAPI.tag?.findByName(name);
    if (!row) return null;
    return toTag(row);
  }

  async save(tag: Tag): Promise<void> {
    await window.electronAPI.tag?.save(JSON.stringify(tag.toJSON()));
  }

  async delete(id: string): Promise<void> {
    await window.electronAPI.tag?.delete(id);
  }

  async exists(name: string): Promise<boolean> {
    return window.electronAPI.tag?.exists(name) ?? false;
  }
}
