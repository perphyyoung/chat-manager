import type { Tag } from "../entities";

export interface TagRepository {
  findAllTags(): Promise<Tag[]>;
  findTagById(id: string): Promise<Tag | null>;
  findTagByName(name: string): Promise<Tag | null>;
  saveTag(tag: Tag): Promise<void>;
  deleteTag(id: string): Promise<void>;
  existsTag(name: string): Promise<boolean>;
}
