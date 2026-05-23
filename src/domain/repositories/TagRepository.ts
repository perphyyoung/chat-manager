import type { Tag } from "../entities";

export interface TagRepository {
  findAll(): Promise<Tag[]>;
  findById(id: string): Promise<Tag | null>;
  findByName(name: string): Promise<Tag | null>;
  save(tag: Tag): Promise<void>;
  delete(id: string): Promise<void>;
  exists(name: string): Promise<boolean>;
}
