import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = "py-data";
const DB_FILE = "chat-manager.db";

let db: Database.Database | null = null;

export function getDbPath(): string {
  return path.join(process.cwd(), DB_DIR, DB_FILE);
}

export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbDir = path.join(process.cwd(), DB_DIR);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(getDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);

  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      text TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
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

    CREATE INDEX IF NOT EXISTS idx_questions_document_id ON questions(document_id);
    CREATE INDEX IF NOT EXISTS idx_questions_sort_order ON questions(document_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
