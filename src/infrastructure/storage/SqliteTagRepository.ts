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

  async findTagByName(name: string): Promise<Tag | null> {
    const row = await window.electronAPI.tag.findTagByName(name);
    if (!row) return null;
    return toTag(row);
  }

  async saveTag(tag: Tag): Promise<void> {
    await window.electronAPI.tag.saveTag(JSON.stringify(tag.toJSON()));
  }

  async deleteTag(id: string): Promise<void> {
    await window.electronAPI.tag.deleteTag(id);
  }

  async existsTag(name: string): Promise<boolean> {
    return await window.electronAPI.tag.existsTag(name);
  }
}
