import { DatabaseSync } from "node:sqlite";
import type { DatabaseSync as SqliteDB } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

const DB_DIR = "py-data";
const DB_FILE = "chat-manager.db";

let db: SqliteDB | null = null;
let dbDir: string | null = null;

/**
 * 获取数据库目录路径
 * 开发环境：使用项目根目录下的 py-data（避免污染生产数据）
 * 生产环境：使用 Electron 的 userData 目录（%APPDATA%/Chat Manager/py-data）
 */
function getDbDir(): string {
  if (dbDir) {
    return dbDir;
  }

  // 通过 process.execPath 判断是否为开发环境
  // 开发环境：execPath 指向 node_modules/electron/dist/electron.exe
  // 生产环境：execPath 指向安装目录的 Chat Manager.exe
  const isDev =
    process.execPath.includes("node_modules") ||
    process.execPath.includes("electron");

  if (isDev) {
    // 开发环境：使用项目根目录
    dbDir = path.join(process.cwd(), DB_DIR);
  } else {
    // 生产环境：使用 userData 目录
    const userData = app.getPath("userData");
    dbDir = path.join(userData, DB_DIR);
  }

  return dbDir;
}

export function getDbPath(): string {
  return path.join(getDbDir(), DB_FILE);
}

export function getDatabase(): SqliteDB {
  if (db) {
    return db;
  }

  const dbDir = getDbDir();
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
  {
    version: 3,
    name: "添加标签支持 - tags 表和 document_tags 关联表",
    sql: `
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

      CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON document_tags(document_id);
      CREATE INDEX IF NOT EXISTS idx_document_tags_tag_id ON document_tags(tag_id);
    `,
  },
  {
    version: 4,
    name: "添加全局搜索 FTS5 索引",
    sql: `
      CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
        id,
        type,
        content,
        metadata,
        tokenize='unicode61'
      );
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
  const result = db.prepare("SELECT MAX(version) as version FROM db_version").get() as { version: number | null } | undefined;
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
