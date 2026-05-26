import { describe, it, expect } from "vitest";
import { escapeHtml, escapeRegex } from "./html";

describe("html utilities", () => {
  describe("escapeHtml", () => {
    it("should escape HTML special characters", () => {
      expect(escapeHtml("<div>&amp;</div>")).toBe(
        "&lt;div&gt;&amp;amp;&lt;/div&gt;",
      );
    });

    it("should escape quotes", () => {
      expect(escapeHtml('"test"')).toBe("&quot;test&quot;");
      expect(escapeHtml("'test'")).toBe("&#039;test&#039;");
    });

    it("should handle empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("should handle plain text", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World");
    });
  });

  describe("escapeRegex", () => {
    it("should escape regex special characters", () => {
      expect(escapeRegex("test.value")).toBe("test\\.value");
    });

    it("should escape brackets", () => {
      expect(escapeRegex("[test]")).toBe("\\[test\\]");
    });

    it("should escape quantifiers", () => {
      expect(escapeRegex("a+b*c?")).toBe("a\\+b\\*c\\?");
    });

    it("should handle empty string", () => {
      expect(escapeRegex("")).toBe("");
    });

    it("should handle plain text", () => {
      expect(escapeRegex("hello")).toBe("hello");
    });
  });
});

describe("search highlight", () => {
  function highlightSearchText(html: string, keyword: string): string {
    if (!keyword.trim()) return html;
    const escapedKeyword = escapeHtml(keyword);
    const regex = new RegExp(`(${escapeRegex(escapedKeyword)})`, "gi");
    return html.replace(regex, '<span class="search-highlight">$1</span>');
  }

  it("should highlight keyword in HTML", () => {
    const html = "<p>Hello World</p>";
    const result = highlightSearchText(html, "World");
    expect(result).toBe('<p>Hello <span class="search-highlight">World</span></p>');
  });

  it("should highlight multiple occurrences", () => {
    const html = "<p>Hello World, World!</p>";
    const result = highlightSearchText(html, "World");
    expect(result).toBe(
      '<p>Hello <span class="search-highlight">World</span>, <span class="search-highlight">World</span>!</p>',
    );
  });

  it("should be case insensitive", () => {
    const html = "<p>Hello WORLD</p>";
    const result = highlightSearchText(html, "world");
    expect(result).toBe('<p>Hello <span class="search-highlight">WORLD</span></p>');
  });

  it("should return original if keyword is empty", () => {
    const html = "<p>Hello World</p>";
    expect(highlightSearchText(html, "")).toBe(html);
    expect(highlightSearchText(html, "   ")).toBe(html);
  });

  it("should escape HTML in keyword", () => {
    const html = "<p>Test &amp; more</p>";
    const result = highlightSearchText(html, "&");
    expect(result).toBe('<p>Test <span class="search-highlight">&amp;</span> more</p>');
  });

  it("should escape regex special characters in keyword", () => {
    const html = "<p>test(1)</p>";
    const result = highlightSearchText(html, "test(1)");
    expect(result).toBe('<p><span class="search-highlight">test(1)</span></p>');
  });
});
