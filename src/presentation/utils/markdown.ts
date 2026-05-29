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

// 注册 Vue 语言支持（基于 HTML）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Prism.languages as Record<string, any>).vue = Prism.languages.extend(
  "html",
  {},
);

// 创建带语法高亮的 marked 实例
export const marked = new Marked(
  markedHighlight({
    emptyLangClass: "language-plaintext",
    langPrefix: "language-",
    highlight(code, lang) {
      const language = Prism.languages[lang] ? lang : "plaintext";
      return Prism.highlight(code, Prism.languages[language]!, language);
    },
  }),
);

marked.setOptions({
  breaks: true, // 支持换行符转换为 <br>
  gfm: true, // 支持 GitHub Flavored Markdown
});

/**
 * 解析 Markdown 内容
 * @param content - Markdown 文本
 * @returns 解析后的 HTML 字符串
 */
export function parseMarkdown(content: string): string {
  return marked.parse(content) as string;
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
