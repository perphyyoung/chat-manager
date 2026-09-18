<script setup lang="ts">
import { ref, onMounted } from "vue";

defineProps<{
  value: string;
  regexMode: boolean;
}>();

const emit = defineEmits<{
  (e: "search", query: string): void;
  (e: "close"): void;
  (e: "toggle-regex"): void;
  (e: "toggle-help"): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit("search", target.value);
}

function handleClear() {
  emit("search", "");
  inputRef.value?.focus();
}

function focus() {
  inputRef.value?.focus();
}

defineExpose({ focus });

onMounted(() => {
  inputRef.value?.focus();
});
</script>

<template>
  <div class="search-input">
    <!-- 正则切换：.* 图标为行业惯例（同 VSCode），选中深蓝底白字 -->
    <button
      type="button"
      class="search-input__toggle"
      :class="{ 'search-input__toggle--active': regexMode }"
      :title="regexMode ? '正则匹配（点击切回普通搜索）' : '普通搜索（点击切换正则匹配）'"
      @click="emit('toggle-regex')"
    >
      .*
    </button>
    <input
      ref="inputRef"
      type="text"
      class="search-input__field"
      placeholder="搜索文档、问题、回答、标签..."
      :value="value"
      @input="handleInput"
    />
    <button type="button" class="search-input__help" title="搜索说明" @click="emit('toggle-help')">
      ?
    </button>
    <button v-if="value" class="search-input__clear" @click="handleClear">清空</button>
  </div>
</template>

<style scoped>
.search-input {
  display: flex;
  align-items: center;
  /* 右侧留出关闭按钮空间 */
  padding: 24px 40px 24px 32px;
  border-bottom: 2px solid var(--color-border);
}

.search-input__toggle {
  margin-right: 16px;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  font-family: var(--font-mono);
  line-height: 1;
  color: var(--color-text-secondary);
  flex: 0 0 auto;
}

.search-input__toggle--active {
  background: var(--color-primary, #1e5eff);
  border-color: var(--color-primary, #1e5eff);
  color: #fff;
}

.search-input__toggle:hover {
  background: var(--color-hover);
}

.search-input__toggle--active:hover {
  background: var(--color-primary, #1e5eff);
}

.search-input__field {
  flex: 1;
  border: none;
  outline: none;
  font-size: 22px;
  background: transparent;
  color: var(--color-text);
}

.search-input__field::placeholder {
  color: var(--color-text-secondary);
}

.search-input__help {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  color: var(--color-text-secondary);
  flex: 0 0 auto;
  margin-right: 8px;
}

.search-input__help:hover {
  color: var(--color-text);
}

.search-input__clear {
  padding: 4px 10px;
  border: none;
  background: var(--color-hover);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.search-input__clear:hover {
  background: var(--color-border);
}
</style>
