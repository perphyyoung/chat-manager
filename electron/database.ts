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

  // 初始化版本控制并执行迁移
  initVersionControl(db);
  runMigrations(db);

  return db;
}

// 数据库版本控制
interface Migration {
  version: number;
  name: string;
  sql: string;
}

// 迁移历史记录
const migrations: Migration[] = [
  {
    version: 1,
    name: "初始 schema - 创建 documents, questions, answers 表",
    sql: `
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
        FOREIGN KEY (document_id) REFERENCES documents(id)
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
    `,
  },
  {
    version: 2,
    name: "添加软删除支持 - is_deleted 和 deleted_at 字段",
    sql: `
      ALTER TABLE documents ADD COLUMN is_deleted INTEGER DEFAULT 0;
      ALTER TABLE documents ADD COLUMN deleted_at TEXT;

      ALTER TABLE questions ADD COLUMN is_deleted INTEGER DEFAULT 0;
      ALTER TABLE questions ADD COLUMN deleted_at TEXT;

      CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_questions_is_deleted ON questions(is_deleted);
    `,
  },
];

// 初始化版本控制表
function initVersionControl(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS db_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

// 获取当前数据库版本
function getCurrentVersion(database: Database.Database): number {
  const row = database
    .prepare("SELECT MAX(version) as version FROM db_version")
    .get() as { version: number | null } | undefined;
  return row?.version ?? 0;
}

// 记录迁移执行
function recordMigration(database: Database.Database, migration: Migration): void {
  database
    .prepare("INSERT INTO db_version (version, name, applied_at) VALUES (?, ?, ?)")
    .run(migration.version, migration.name, new Date().toISOString());
}

// 执行迁移
function runMigrations(database: Database.Database): void {
  const currentVersion = getCurrentVersion(database);

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      try {
        // 执行迁移 SQL
        database.exec(migration.sql);
        // 记录迁移
        recordMigration(database, migration);
      } catch (error) {
        console.error(`[DB Migration] 版本 ${migration.version}: ${migration.name} - 执行失败`, error);
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
