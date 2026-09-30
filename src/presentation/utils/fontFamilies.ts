/**
 * 字体家族相关工具：本机字体枚举、等宽判定、中文名映射与回退候选。
 * 枚举结果与名称映射均为模块级单例——设置页有「全部/等宽」两个选择器实例，
 * 枚举（含授权弹窗）与 canvas 判定全程只做一次。
 */

/** 家族名长度上限：字体名不会很长，超长视为异常值 */
const FONT_FAMILY_MAX_LEN = 64;

/** 回退候选：无法枚举本机字体时至少给出常用字体；value 为可直接写入 font-family 的 CSS 值 */
export const FONT_CANDIDATES = {
  standard: [
    { value: "", label: "跟随系统" },
    { value: '"Segoe UI", sans-serif', label: "Segoe UI" },
    { value: '"Microsoft YaHei", sans-serif', label: "微软雅黑 (Microsoft YaHei)" },
    { value: '"PingFang SC", sans-serif', label: "苹方 (PingFang SC)" },
    { value: "Roboto, sans-serif", label: "Roboto" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: '"Helvetica Neue", sans-serif', label: "Helvetica Neue" },
    { value: '"Noto Sans SC", sans-serif', label: "思源黑体 (Noto Sans SC)" },
  ],
  mono: [
    { value: "", label: "跟随系统" },
    { value: "Consolas, monospace", label: "Consolas" },
    { value: '"Courier New", monospace', label: "Courier New" },
    { value: '"Cascadia Code", monospace', label: "Cascadia Code" },
    { value: '"JetBrains Mono", monospace', label: "JetBrains Mono" },
    { value: '"Fira Code", monospace', label: "Fira Code" },
    { value: '"Source Code Pro", monospace', label: "Source Code Pro" },
    { value: "Menlo, monospace", label: "Menlo" },
    { value: "Monaco, monospace", label: "Monaco" },
  ],
};

/**
 * 家族名清洗：先剥掉引号，再取开头的合法片段（中英文、数字与 `.` `_` `-` 空格），
 * 遇到第一个非法字符即截断并限长。
 * 值来自本机字体名，不清洗的话一个 `;` 就能把整条 font-family 打崩；
 * 「截断」而非「剔除非法字符」是为了不留拼接出的假名字（`"Arial";color:red` → `Arial`）。
 */
export function sanitizeFontFamily(name: string): string {
  const unquoted = name.replace(/["']/g, "").trim();
  const lead = unquoted.match(/^[\p{L}\p{N} ._-]+/u);
  return (lead?.[0] ?? "").trim().slice(0, FONT_FAMILY_MAX_LEN);
}

/** 提取 CSS 值中的第一个字体族名（兼容带引号与不带引号），空串 CSS 值返回 null */
export function extractFamily(cssValue: string): string | null {
  if (!cssValue) {
    return null;
  }
  const match = cssValue.match(/"([^"]+)"|^([^,\s]+)/);
  return match?.[1] ?? match?.[2] ?? null;
}

/** 显示名：有中文映射 → `中文名 (English)`，否则原样 */
export function displayFontFamily(family: string, map: Record<string, string>): string {
  const cn = family ? map[family] : "";
  return cn ? `${cn} (${family})` : family;
}

/** 搜索文本：中文名与英文族名都要能被搜到，否则用户搜「雅黑」搜不到 Microsoft YaHei */
export function fontFamilySearchText(family: string, map: Record<string, string>): string {
  const cn = map[family];
  return cn ? `${family} ${cn}` : family;
}

/**
 * 列表渲染窗口：有选中项时把窗口挪到它周围（保留字母序），否则从头开始。
 * 列表只渲染 `max` 项，选中项若在窗口外根本不在 DOM 里，滚动定位也就无从谈起。
 * `offset` 是选中项上方保留的上下文项数；末尾再夹一次避免选中项靠后时窗口留白。
 */
export function fontListWindow(
  all: string[],
  selected: string,
  max: number,
  offset: number,
): string[] {
  const idx = selected ? all.indexOf(selected) : -1;
  const desired = idx > offset ? idx - offset : 0;
  const start = Math.min(desired, Math.max(0, all.length - max));
  return all.slice(start, start + max);
}

// Canvas 测量法结果缓存
const measureCache = new Map<string, boolean>();
const monoCache = new Map<string, boolean>();

/**
 * Canvas 测量法：字体存在时三个基准都渲染目标字体、宽度相等；
 * 不存在时回退到三个不同基准、宽度互异。官方 FontFaceSet.check 对不存在的字体也返回 true，不可用。
 */
function isInstalledByMeasure(family: string): boolean {
  const cached = measureCache.get(family);
  if (cached !== undefined) {
    return cached;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return true;
  }
  const text = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const fontSpec = `72px "${family}"`;
  ctx.font = `${fontSpec}, serif`;
  const wSerif = ctx.measureText(text).width;
  ctx.font = `${fontSpec}, sans-serif`;
  const wSans = ctx.measureText(text).width;
  ctx.font = `${fontSpec}, monospace`;
  const wMono = ctx.measureText(text).width;
  const installed = wSerif === wSans && wSans === wMono;
  measureCache.set(family, installed);
  return installed;
}

/** 等宽字体名特征词：命中即判等宽，不依赖渲染（解决 canvas 对未激活字体的回退误判） */
const MONO_KEYWORDS = [
  "Mono",
  "Menlo",
  "Consolas",
  "Courier",
  "Code",
  "Console",
  "JetBrains",
  "Fira",
  "Cascadia",
  "Term",
];

/** 等宽判定：关键词命中直接判等宽；否则预加载字体后采样多字符宽度（等宽字体所有字符宽度相同） */
export async function isMonoFamily(family: string): Promise<boolean> {
  if (MONO_KEYWORDS.some((keyword) => family.includes(keyword))) {
    return true;
  }
  const cached = monoCache.get(family);
  if (cached !== undefined) {
    return cached;
  }
  // 预加载字体，避免 canvas 对未激活字体（用户级安装字体）回退默认字体导致误判
  await document.fonts.load(`16px "${family}"`).catch(() => {});
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return false;
  }
  ctx.font = `16px "${family}"`;
  const widths = ["i", "W", "0", "l"].map((char) => ctx.measureText(char).width);
  const mono = widths.every((width) => width === widths[0]);
  monoCache.set(family, mono);
  return mono;
}

export interface FontListData {
  /** 全部候选 family 名（枚举成功为字母序，回退时为候选表顺序） */
  families: string[];
  /** 与 families 逐项对齐：是否等宽 */
  monoFlags: boolean[];
  /** ok=本机枚举成功；fallback=枚举失败，仅候选表中已安装的常用字体 */
  status: "ok" | "fallback";
}

/**
 * 回退列表：queryLocalFonts 不可用时，候选表按 Canvas 测量法过滤已安装项。
 * 「全部字体」含等宽候选（非代码区域也可选用等宽字体），先 standard 后 mono 保持原有顺序
 */
function buildFallbackList(): FontListData {
  const ordered: string[] = [];
  const monoSet = new Set<string>();
  for (const font of FONT_CANDIDATES.standard) {
    const family = extractFamily(font.value);
    if (family && isInstalledByMeasure(family)) {
      ordered.push(family);
    }
  }
  for (const font of FONT_CANDIDATES.mono) {
    const family = extractFamily(font.value);
    if (family && isInstalledByMeasure(family)) {
      ordered.push(family);
      monoSet.add(family);
    }
  }
  return {
    families: ordered,
    monoFlags: ordered.map((family) => monoSet.has(family)),
    status: "fallback",
  };
}

/**
 * 枚举本机字体：queryLocalFonts 成功时去重排序并并行判定等宽性；
 * 权限被拒或环境不支持时回退候选表（不静默失败，状态返回给界面提示）
 */
async function enumerateFonts(): Promise<FontListData> {
  const winWithFonts = window as unknown as {
    queryLocalFonts?: () => Promise<Array<{ family: string }>>;
  };
  if (typeof winWithFonts.queryLocalFonts !== "function") {
    return buildFallbackList();
  }
  try {
    const fonts = await winWithFonts.queryLocalFonts();
    const families = [
      ...new Set(fonts.map((font) => sanitizeFontFamily(font.family)).filter((family) => family)),
    ].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
    if (families.length === 0) {
      // WebView2 上权限被拒可能表现为返回空数组
      return buildFallbackList();
    }
    // 并行判定等宽性（含字体预加载），与 families 顺序逐项对齐
    const monoFlags = await Promise.all(families.map((family) => isMonoFamily(family)));
    return { families, monoFlags, status: "ok" };
  } catch (error) {
    console.warn(`enumerate system fonts failed: ${String(error)}`);
    return buildFallbackList();
  }
}

let fontListPromise: Promise<FontListData> | null = null;

/** 加载本机字体列表（单例）：必须由用户手势（展开选择器）触发，Local Font Access API 才会弹授权框 */
export function loadFontList(): Promise<FontListData> {
  fontListPromise ??= enumerateFonts();
  return fontListPromise;
}

let nameMapPromise: Promise<Record<string, string>> | null = null;

/** 中文名映射（单例）：主进程读数据目录 font-family-map.toml，失败回退空表只显示英文 */
export function loadFontNameMap(): Promise<Record<string, string>> {
  nameMapPromise ??= window.electronAPI.getFontFamilyMap().catch(() => ({}));
  return nameMapPromise;
}
