import { app } from "electron";
import { existsSync } from "node:fs";
import { mkdtemp, rm, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

// markdownlint 配置由 vite 从 public 拷贝到 out/renderer；候选路径兼容三种运行环境：
// 打包后（asar 内 out/renderer）、e2e（getAppPath 为 out/main，配置在 out/renderer）、dev（public）
function getMarkdownlintConfigPath(): string {
  const appPath = app.getAppPath();
  const candidates = app.isPackaged
    ? [join(appPath, "out", "renderer", "markdownlint.jsonc")]
    : [
        join(appPath, "..", "renderer", "markdownlint.jsonc"),
        join(appPath, "public", "markdownlint.jsonc"),
      ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

/**
 * 使用 markdownlint-cli2 的 fix 能力格式化 markdown 文本
 * - cli2 的 fix 只支持真实文件，因此将内容写入临时文件执行后读回
 * - 失败抛错（禁止静默失败），由 IPC 层返回错误给渲染进程提示
 */
export async function formatMarkdown(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "cm-format-"));
  const file = join(dir, "content.md");
  try {
    await writeFile(file, content, "utf8");
    const { main: markdownlintCli2 } = await import("markdownlint-cli2");
    const config = getMarkdownlintConfigPath();
    await markdownlintCli2({
      directory: dir,
      argv: ["--config", config, "--fix", file],
    });
    return await readFile(file, "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
