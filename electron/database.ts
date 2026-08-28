import { DatabaseSync } from "node:sqlite";
import type { DatabaseSync as SqliteDB } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { dataDirManager } from "./DataDirManager";

const DB_FILE = "chat-manager.db";

let db: SqliteDB | null = null;

export function getDbPath(): string {
  return path.join(dataDirManager.getDbDir(), DB_FILE);
}

export function getDatabase(): SqliteDB {
  if (db) {
    return db;
  }

  const dbDir = dataDirManager.getDbDir();
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new DatabaseSync(getDbPath());
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  initVersionControl(db);
  runMigrations(db);

  return db;
}

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "完整 schema - documents, questions, answers, tags, search_fts 和触发器",
    sql: `
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        text TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        deleted_at TEXT,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS answers (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS document_tags (
        document_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (document_id, tag_id),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
        id,
        type,
        content,
        metadata,
        tokenize='unicode61'
      );

      CREATE INDEX IF NOT EXISTS idx_questions_document_id ON questions(document_id);
      CREATE INDEX IF NOT EXISTS idx_questions_sort_order ON questions(document_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_questions_is_deleted ON questions(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
      CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON document_tags(document_id);
      CREATE INDEX IF NOT EXISTS idx_document_tags_tag_id ON document_tags(tag_id);

      CREATE TRIGGER IF NOT EXISTS trg_questions_updated
      AFTER UPDATE ON questions
      FOR EACH ROW
      BEGIN
        UPDATE documents SET updated_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now') WHERE id = OLD.document_id;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_answers_updated
      AFTER UPDATE ON answers
      FOR EACH ROW
      BEGIN
        UPDATE documents SET updated_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', 'now') WHERE id = (
          SELECT document_id FROM questions WHERE id = OLD.question_id
        );
      END;
    `,
  },
];

function initVersionControl(db: SqliteDB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS db_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function getCurrentVersion(db: SqliteDB): number {
  const result = db.prepare("SELECT MAX(version) as version FROM db_version").get() as
    | { version: number | null }
    | undefined;
  return result?.version ?? 0;
}

function recordMigration(db: SqliteDB, migration: Migration): void {
  db.prepare("INSERT INTO db_version (version, name, applied_at) VALUES (?, ?, ?)").run(
    migration.version,
    migration.name,
    new Date().toISOString(),
  );
}

function runMigrations(db: SqliteDB): void {
  const currentVersion = getCurrentVersion(db);

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      try {
        db.exec(migration.sql);
        recordMigration(db, migration);
      } catch (error) {
        console.error(
          `[DB Migration] 版本 ${migration.version}: ${migration.name} - 执行失败`,
          error,
        );
        throw error;
      }
    }
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
