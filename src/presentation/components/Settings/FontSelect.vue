<script setup lang="ts">
/**
 * FontSelect - 字体家族搜索选择器（设置页「全部字体 / 等宽字体」）。
 * 交互对齐 paim：首次展开才枚举本机字体（Local Font Access API 要求用户手势）、
 * 中英文同时搜索、过滤后最多渲染 200 项、展开即定位选中项。
 * 样式用 Tailwind 工具类（组件级按需引入，无 preflight），配色引用项目 CSS 变量，深浅主题自动跟随。
 */
import { computed, nextTick, onMounted, ref } from "vue";
import "./font-select.css";
import {
  displayFontFamily,
  extractFamily,
  fontFamilySearchText,
  fontListWindow,
  loadFontList,
  loadFontNameMap,
  sanitizeFontFamily,
  type FontListData,
} from "../../utils/fontFamilies";

const props = withDefaults(
  defineProps<{
    // 存储格式与设置 store 保持一致：完整 CSS 值（如 '"Microsoft YaHei", sans-serif'），空串=跟随系统
    modelValue: string;
    // true 时仅列等宽字体，CSS 值后缀 monospace
    monoOnly?: boolean;
  }>(),
  { monoOnly: false },
);
const emit = defineEmits<{ "update:modelValue": [string] }>();

/** 过滤后最多渲染的项数（本机字体常上千，避免长列表卡顿） */
const MAX_VISIBLE = 200;
/** 定位选中项时，其上方保留的上下文项数 */
const SELECTED_OFFSET = 40;
/** 面板宽度（px）：与按钮右缘对齐、向左展开 */
const PANEL_WIDTH = 350;

const open = ref(false);
const loading = ref(false);
const loaded = ref(false);
const keyword = ref("");
const nameMap = ref<Record<string, string>>({});
const fontData = ref<FontListData | null>(null);
const anchor = ref<{ right: number; top: number } | null>(null);
const trigger = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);

/** 当前选中的 family（modelValue 是完整 CSS 值，需解出首族名比较） */
const selectedFamily = computed(() => extractFamily(props.modelValue) ?? "");

/** 基础候选：monoOnly 时只保留等宽项 */
const baseFamilies = computed(() => {
  const data = fontData.value;
  if (!data) {
    return [];
  }
  return props.monoOnly ? data.families.filter((_, index) => data.monoFlags[index]) : data.families;
});

/** 关键字过滤：中文名与英文族名同时匹配、大小写不敏感 */
const matched = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) {
    return baseFamilies.value;
  }
  return baseFamilies.value.filter((family) =>
    fontFamilySearchText(family, nameMap.value).toLowerCase().includes(kw),
  );
});

/** 渲染窗口：只渲染 MAX_VISIBLE 项，窗口随选中项移动保证其在 DOM 中 */
const visible = computed(() =>
  fontListWindow(matched.value, selectedFamily.value, MAX_VISIBLE, SELECTED_OFFSET),
);

/** 触发按钮文案：空值显示「跟随系统」 */
const label = computed(() =>
  selectedFamily.value ? displayFontFamily(selectedFamily.value, nameMap.value) : "跟随系统",
);

// 中文名映射不需要用户手势，挂载即取：否则按钮先显英文族名，展开后才跳变成「中文名 (English)」
onMounted(async () => {
  nameMap.value = await loadFontNameMap();
});

async function loadFonts() {
  if (loaded.value) {
    return;
  }
  loaded.value = true;
  loading.value = true;
  try {
    // 枚举与映射并行等齐；单例由 fontFamilies 模块保证只执行一次
    const [data] = await Promise.all([loadFontList(), loadFontNameMap()]);
    fontData.value = data;
  } finally {
    loading.value = false;
  }
}

/** 展开后滚动到当前选中项并居中（无选中或不在列表则停在窗口顶部） */
function scrollToSelected() {
  listEl.value
    ?.querySelector<HTMLElement>('[data-selected="true"]')
    ?.scrollIntoView({ block: "center", inline: "nearest" });
}

async function toggle() {
  if (open.value) {
    open.value = false;
    return;
  }
  const rect = trigger.value?.getBoundingClientRect();
  anchor.value = rect
    ? {
        // 设置弹窗居中、按钮贴近其右内边距，与按钮右缘对齐向左展开，避免越出弹窗右边界
        right: Math.max(8, window.innerWidth - rect.right),
        top: rect.bottom + 4,
      }
    : null;
  open.value = true;
  keyword.value = "";
  await nextTick();
  searchInput.value?.focus();
  await loadFonts();
  // 面板 v-if 重建、scrollTop 每次归零，定位必须在展开流程末尾，不能挂在首次加载上
  await nextTick();
  scrollToSelected();
}

function pick(family: string) {
  const safe = sanitizeFontFamily(family);
  const generic = props.monoOnly ? "monospace" : "sans-serif";
  emit("update:modelValue", safe ? `"${safe}", ${generic}` : "");
  open.value = false;
}
</script>

<template>
  <div class="font-select w-[300px] shrink-0">
    <button
      ref="trigger"
      type="button"
      class="flex w-full items-center justify-between rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
      :title="label"
      @click="toggle"
    >
      <span class="truncate">{{ label }}</span>
      <span class="ml-2 shrink-0 text-xs text-[var(--color-text-secondary)]">▾</span>
    </button>

    <Teleport to="body">
      <!-- 遮罩与面板同用最高层级：设置弹窗本身 9600，只有 highest 压得住 -->
      <div v-if="open" class="fixed inset-0 z-[var(--z-highest)]" @click="open = false" />
      <div
        v-if="open && anchor"
        class="font-select__panel fixed z-[var(--z-highest)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
        :style="{ right: `${anchor.right}px`, top: `${anchor.top}px`, width: `${PANEL_WIDTH}px` }"
      >
        <div class="border-b border-[var(--color-border)] p-2">
          <input
            ref="searchInput"
            v-model="keyword"
            type="text"
            class="w-full rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-secondary)]"
            :placeholder="
              baseFamilies.length ? `在 ${baseFamilies.length} 个字体中搜索` : '搜索字体'
            "
            @keydown.esc="open = false"
          />
        </div>
        <!-- 枚举失败提示条固定在列表上方（放列表末尾会看不见） -->
        <p
          v-if="fontData?.status === 'fallback'"
          class="border-b border-[var(--color-border)] px-3 py-2 text-[11px] leading-snug text-[var(--color-text-secondary)]"
        >
          未能读取本机字体（授权被拒或环境不支持），以下仅显示已安装的常用字体
        </p>
        <ul ref="listEl" class="max-h-64 overflow-y-auto py-1">
          <li>
            <button
              type="button"
              class="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-[var(--color-hover)]"
              :class="!modelValue ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'"
              @click="pick('')"
            >
              跟随系统
            </button>
          </li>
          <li v-if="loading" class="px-3 py-1.5 text-sm text-[var(--color-text-secondary)]">
            读取本机字体…
          </li>
          <li v-for="family in visible" :key="family">
            <button
              type="button"
              class="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-[var(--color-hover)]"
              :class="
                family === selectedFamily
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text)]'
              "
              :data-selected="family === selectedFamily"
              @click="pick(family)"
            >
              {{ displayFontFamily(family, nameMap) }}
            </button>
          </li>
          <li
            v-if="!loading && matched.length === 0"
            class="px-3 py-1.5 text-sm text-[var(--color-text-secondary)]"
          >
            没有匹配的字体家族
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* 未引 preflight，组件内（含 Teleport 到 body 的面板）原生元素的 UA 样式在此统一清除，
   之后新增元素无需逐个补 bg-/border-0。放在 components 层：优先级低于 utilities 层的
   Tailwind 显式类（border/bg/font 等），只在未显式设置时兜底，不会压掉触发按钮的边框与底色 */
@layer components {
  .font-select :where(button),
  .font-select__panel :where(button) {
    border: 0 solid;
    background-color: transparent;
    font: inherit;
  }

  .font-select :where(input),
  .font-select__panel :where(input) {
    background-color: transparent;
    font: inherit;
  }

  .font-select__panel :where(ul) {
    list-style: none;
  }
}
</style>
