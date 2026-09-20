import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

const DB_DIR = "py-data";

class DataDirManager {
  private static instance: DataDirManager | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): DataDirManager {
    if (!DataDirManager.instance) {
      DataDirManager.instance = new DataDirManager();
    }
    return DataDirManager.instance;
  }

  /**
   * 初始化数据目录：确保 py-data 目录存在
   * 应用启动时调用一次
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    const dbDir = this.getDbDir();
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.initialized = true;
  }

  /**
   * 获取 py-data 目录路径
   * 开发环境：项目根目录/py-data
   * 生产环境：%APPDATA%/Chat Manager/py-data
   * E2E 环境：每个实例独立目录 temp/e2e/{E2E_INSTANCE}，避免多 worker 并发写同一库
   */
  getDbDir(): string {
    const isDev =
      process.execPath.includes("node_modules") || process.execPath.includes("electron");

    if (isDev) {
      if (process.env.E2E === "1") {
        const instance = process.env.E2E_INSTANCE ?? "default";
        return path.join(process.cwd(), "temp", "e2e", instance);
      }
      return path.join(process.cwd(), DB_DIR);
    }
    return path.join(app.getPath("userData"), DB_DIR);
  }
}

export const dataDirManager = DataDirManager.getInstance();
