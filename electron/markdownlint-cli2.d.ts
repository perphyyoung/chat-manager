/**
 * markdownlint-cli2 无官方类型声明，此处补充最小声明（仅覆盖本应用用到的 API）
 */
declare module "markdownlint-cli2" {
  interface MarkdownlintCli2Params {
    directory?: string;
    argv?: string[];
    optionsOverride?: Record<string, unknown>;
    fileContents?: Record<string, string>;
    allowStdin?: boolean;
    noGlobs?: boolean;
    noImport?: boolean;
    logMessage?: (message: string) => void;
    logError?: (message: string) => void;
  }

  export const main: (params: MarkdownlintCli2Params) => Promise<void>;
}
