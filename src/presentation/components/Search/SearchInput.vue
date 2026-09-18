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
    <span class="search-input__icon">🔍</span>
    <input
      ref="inputRef"
      type="text"
      class="search-input__field"
      placeholder="搜索文档、问题、回答、标签..."
      :value="value"
      @input="handleInput"
    />
    <button
      type="button"
      class="search-input__regex"
      :class="{ 'search-input__regex--active': regexMode }"
      :title="regexMode ? '当前为正则匹配' : '切换为正则匹配'"
      @click="emit('toggle-regex')"
    >
      正则
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

.search-input__icon {
  margin-right: 16px;
  font-size: 24px;
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

.search-input__regex {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  margin-right: 8px;
}

.search-input__regex--active {
  background: var(--color-primary, #1e5eff);
  border-color: var(--color-primary, #1e5eff);
  color: #fff;
}

.search-input__regex:hover {
  background: var(--color-hover);
}

.search-input__regex--active:hover {
  background: var(--color-primary, #1e5eff);
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
