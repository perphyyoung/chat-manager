import { load } from "js-yaml";
import { Marked } from "marked";
import { createHighlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { escapeHtml, escapeRegex } from "./html";

// 语言别名映射：将常见的非标准语言标识符映射到 Shiki 语言 id，未识别的语言回退 "text"
const LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  "c#": "csharp",
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  dockerfile: "docker",
};

// 渲染层代码高亮使用 Shiki（替代 Prism）：
// - Shiki token 严格按行分组不跨行，规避嵌套语言（vue 的 <script>）跨行 token 被切行拆坏的问题
// - 纯 JS 正则引擎免 WASM 加载；模块加载时完成初始化，之后 codeToHtml 同步可用
const highlighter = await createHighlighter({
  langs: [
    "javascript",
    "typescript",
    "python",
    "java",
    "css",
    "json",
    "markdown",
    "bash",
    "sql",
    "yaml",
    "rust",
    "go",
    "jsx",
    "tsx",
    "scss",
    "docker",
    "nginx",
    "c",
    "cpp",
    "csharp",
    "html",
    "vue",
    "ruby",
    "text",
  ],
  // 主题与编辑器 CodeMirror 的 oneDark 视觉呼应
  themes: ["one-dark-pro"],
  engine: createJavaScriptRegexEngine(),
});

function resolveLang(lang?: string): string {
  const mapped = LANGUAGE_ALIASES[lang || ""] || lang;
  return mapped && highlighter.getLoadedLanguages().includes(mapped as never) ? mapped : "text";
}

// 自定义代码块渲染：Shiki 高亮 HTML 自带主题内联样式（背景/前景色），保留其 <pre> 属性让主题生效
export const marked = new Marked();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderer = new (marked as any).Renderer();
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const codeText = text.replace(/\n$/, "");
  const shikiHtml = highlighter.codeToHtml(codeText, {
    lang: resolveLang(lang),
    theme: "one-dark-pro",
  });
  const preAttrs = shikiHtml.match(/^<pre([^>]*)>[\s\S]*<\/pre>/)?.[1] ?? "";
  const inner = shikiHtml.replace(/^<pre[^>]*>/, "").replace(/<\/pre>\s*$/, "");
  // 语言徽标：渲染层直接读取代码块已声明的 lang，不改源码；无语言（``` 后为空）时不显示
  const badge = lang ? `<span class="code-block-lang">${escapeHtml(lang)}</span>` : "";
  // 行号列与代码列分离：行号按代码物理行数生成（Shiki token 不跨行，物理行数 = 源码行数），与代码列横向并排
  const lineCount = codeText.split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");
  const lines = `<span class="code-lines" aria-hidden="true">${lineNumbers}</span>`;
  return `<pre${preAttrs}>${badge}<button class="code-copy-btn" type="button">复制</button>${lines}${inner}</pre>`;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
marked.setOptions({ renderer } as any);

marked.setOptions({
  breaks: true, // 支持换行符转换为 <br>
  gfm: true, // 支持 GitHub Flavored Markdown
});

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown> | null;
  html: string;
}

/**
 * 解析 Markdown 内容（含 YAML frontmatter）
 * @param content - Markdown 文本
 * @returns frontmatter 对象和渲染后的 HTML
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (match) {
    try {
      const frontmatter = load(match[1]!) as Record<string, unknown>;
      const html = marked.parse(match[2]!) as string;
      return { frontmatter, html };
    } catch {
      // YAML 解析失败时回退到整体渲染
      return { frontmatter: null, html: marked.parse(content) as string };
    }
  }
  return { frontmatter: null, html: marked.parse(content) as string };
}

/**
 * 在 HTML 中高亮搜索关键词
 * @param html - HTML 字符串
 * @param keyword - 搜索关键词
 * @returns 高亮后的 HTML 字符串
 */
export function highlightSearchText(html: string, keyword: string): string {
  if (!keyword.trim()) return html;
  const escapedKeyword = escapeHtml(keyword);
  const regex = new RegExp(`(${escapeRegex(escapedKeyword)})`, "gi");
  return html.replace(regex, '<span class="search-highlight">$1</span>');
}
