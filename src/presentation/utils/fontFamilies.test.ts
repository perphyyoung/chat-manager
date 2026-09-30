import { describe, expect, it } from "vitest";
import {
  displayFontFamily,
  extractFamily,
  fontFamilySearchText,
  fontListWindow,
  sanitizeFontFamily,
} from "./fontFamilies";

describe("sanitizeFontFamily", () => {
  it("剥掉引号并去除首尾空白", () => {
    expect(sanitizeFontFamily('"Microsoft YaHei"')).toBe("Microsoft YaHei");
    expect(sanitizeFontFamily("  Arial  ")).toBe("Arial");
  });

  it("遇到非法字符即截断，不留拼接出的假名字", () => {
    expect(sanitizeFontFamily('Arial";color:red')).toBe("Arial");
    expect(sanitizeFontFamily("Foo_Bar-1.2 中文")).toBe("Foo_Bar-1.2 中文");
  });

  it("无合法前缀返回空串", () => {
    expect(sanitizeFontFamily('";color:red')).toBe("");
  });

  it("超长截断到 64 字符", () => {
    expect(sanitizeFontFamily("A".repeat(100))).toHaveLength(64);
  });
});

describe("extractFamily", () => {
  it("空串返回 null", () => {
    expect(extractFamily("")).toBeNull();
  });

  it("提取带引号的族名", () => {
    expect(extractFamily('"Microsoft YaHei", sans-serif')).toBe("Microsoft YaHei");
  });

  it("提取不带引号的族名", () => {
    expect(extractFamily("Consolas, monospace")).toBe("Consolas");
  });
});

describe("displayFontFamily", () => {
  it("有映射显示 中文名 (English)", () => {
    expect(displayFontFamily("Microsoft YaHei", { "Microsoft YaHei": "微软雅黑" })).toBe(
      "微软雅黑 (Microsoft YaHei)",
    );
  });

  it("无映射保持英文", () => {
    expect(displayFontFamily("Arial", {})).toBe("Arial");
  });
});

describe("fontFamilySearchText", () => {
  it("拼接英文与中文供搜索", () => {
    expect(fontFamilySearchText("Microsoft YaHei", { "Microsoft YaHei": "微软雅黑" })).toBe(
      "Microsoft YaHei 微软雅黑",
    );
  });

  it("无映射只返回英文", () => {
    expect(fontFamilySearchText("Arial", {})).toBe("Arial");
  });
});

describe("fontListWindow", () => {
  const all = Array.from({ length: 10 }, (_, index) => `F${index}`);

  it("无选中时从头开始", () => {
    expect(fontListWindow(all, "", 3, 1)).toEqual(["F0", "F1", "F2"]);
  });

  it("选中项靠前时从头开始", () => {
    expect(fontListWindow(all, "F1", 3, 1)[0]).toBe("F0");
  });

  it("选中项靠后时窗口移到其上方并保留 offset", () => {
    expect(fontListWindow(all, "F8", 3, 2)).toEqual(["F6", "F7", "F8"]);
  });

  it("选中项靠近末尾时窗口夹取以填满 max", () => {
    expect(fontListWindow(all, "F9", 4, 2)).toEqual(["F6", "F7", "F8", "F9"]);
  });
});
