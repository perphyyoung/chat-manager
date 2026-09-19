import { app } from "electron";
import { mkdtemp, rm, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

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
    const config = join(app.getAppPath(), ".markdownlint.jsonc");
    await markdownlintCli2({
      directory: dir,
      argv: ["--config", config, "--fix", file],
    });
    return await readFile(file, "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
