<script setup lang="ts">
import { ref, onMounted } from "vue";

defineProps<{
  value: string;
}>();

const emit = defineEmits<{
  (e: "search", query: string): void;
  (e: "close"): void;
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
    <button v-if="value" class="search-input__clear" @click="handleClear">
      ×
    </button>
  </div>
</template>

<style scoped>
.search-input {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border, #eee);
}

.search-input__icon {
  margin-right: 12px;
  font-size: 18px;
}

.search-input__field {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  background: transparent;
  color: var(--color-text, #333);
}

.search-input__field::placeholder {
  color: var(--color-text-secondary, #999);
}

.search-input__clear {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--color-bg-secondary, #f0f0f0);
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: var(--color-text-secondary, #666);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-input__clear:hover {
  background: var(--color-bg-tertiary, #e0e0e0);
}
</style>
