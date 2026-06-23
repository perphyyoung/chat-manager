import { load } from "js-yaml";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import Prism from "prismjs";
import { escapeHtml, escapeRegex } from "./html";

// 加载常用语言支持
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-nginx";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";

// 注册 Vue 语言支持（基于 HTML）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Prism.languages as Record<string, any>).vue = Prism.languages.extend(
  "html",
  {},
);

// 语言别名映射：将常见的非标准语言标识符映射到 Prism 支持的语言名
const LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  "c#": "csharp",
  "js": "javascript",
  "ts": "typescript",
  "py": "python",
  "sh": "bash",
  "shell": "bash",
  "yml": "yaml",
  "dockerfile": "docker",
};

// 创建带语法高亮的 marked 实例
export const marked = new Marked(
  markedHighlight({
    emptyLangClass: "language-plaintext",
    langPrefix: "language-",
    highlight(code, lang) {
      const mappedLang = LANGUAGE_ALIASES[lang] || lang;
      const language = Prism.languages[mappedLang] ? mappedLang : "plaintext";
      return Prism.highlight(code, Prism.languages[language]!, language);
    },
  }),
);

// 自定义代码块渲染，使用映射后的语言名作为 class，避免特殊字符（如 c++）导致 CSS 选择器问题
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderer = new (marked as any).Renderer();
const originalCode = renderer.code.bind(renderer);
renderer.code = function({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean }) {
  const mappedLang = LANGUAGE_ALIASES[lang || ""] || lang || "plaintext";
  const rawHtml = originalCode({ text, lang: mappedLang, escaped });
  // 将 class="language-xxx" 中的语言名替换为映射后的名称
  return rawHtml.replace(/class="language-[^"]*"/g, `class="language-${mappedLang}"`);
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
