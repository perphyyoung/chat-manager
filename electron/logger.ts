import ElectronLogger from "electron-log";
import path from "node:path";

class Logger {
  private static instance: Logger | null = null;

  private constructor() {
    ElectronLogger.initialize();
    ElectronLogger.transports.file.resolvePathFn = () => path.join(process.cwd(), "cm.log");
    ElectronLogger.transports.file.level = "debug";
    ElectronLogger.transports.console.level = "warn";
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  error(message: string): void {
    ElectronLogger.error(message);
  }

  warn(message: string): void {
    ElectronLogger.warn(message);
  }

  info(message: string): void {
    ElectronLogger.info(message);
  }

  debug(message: string): void {
    ElectronLogger.debug(message);
  }
}

// 导出单例实例（初始化在 main.ts 里完成）
export const log = Logger.getInstance();
