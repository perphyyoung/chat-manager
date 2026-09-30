import { app } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * 解析随程序分发的 public 资源（vite 构建时从 public 原样拷贝到 out/renderer）
 * 必须兼容三种运行环境，不能只靠 app.isPackaged 区分：
 * - 打包后：getAppPath 为 asar 根，资源在 out/renderer
 * - e2e：构建后直接启动 out/main，isPackaged 仍为 false，资源在相邻的 out/renderer
 * - dev：getAppPath 为项目根，资源在 public
 * 均不存在时返回首选路径，让调用方的后续读取正常报错，避免静默失败
 */
export function resolvePublicResource(fileName: string): string {
  const appPath = app.getAppPath();
  const candidates = app.isPackaged
    ? [path.join(appPath, "out", "renderer", fileName)]
    : [path.join(appPath, "..", "renderer", fileName), path.join(appPath, "public", fileName)];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}
