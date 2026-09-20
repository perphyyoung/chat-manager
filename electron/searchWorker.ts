import { DatabaseSync } from "node:sqlite";
import type { DatabaseSync as SqliteDB } from "node:sqlite";
import { parentPort } from "node:worker_threads";
import type { SearchResults } from "../src/types/search";
import { searchRegexFromDb } from "./regexSearch";

interface WorkerRequest {
  requestId: string;
  dbPath: string;
  searchText: string;
  limit: number;
}

interface WorkerResponse {
  requestId: string;
  ok: boolean;
  results?: SearchResults;
  error?: string;
}

// 按 dbPath 缓存连接：单实例应用通常只有一个库，避免每次请求都重开连接
const connections = new Map<string, SqliteDB>();

function getConnection(dbPath: string): SqliteDB {
  let conn = connections.get(dbPath);
  if (!conn) {
    conn = new DatabaseSync(dbPath);
    connections.set(dbPath, conn);
  }
  return conn;
}

if (parentPort) {
  parentPort.on("message", (msg: WorkerRequest) => {
    const { requestId, dbPath, searchText, limit } = msg;
    try {
      const db = getConnection(dbPath);
      const results = searchRegexFromDb(db, searchText, limit);
      parentPort!.postMessage({ requestId, ok: true, results } as WorkerResponse);
    } catch (err) {
      parentPort!.postMessage({
        requestId,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      } as WorkerResponse);
    }
  });
}
