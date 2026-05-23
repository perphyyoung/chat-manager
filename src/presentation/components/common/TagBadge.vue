<script setup lang="ts">
interface Props {
  name: string;
}

defineProps<Props>();
</script>

<template>
  <span class="tag-badge">
    {{ name }}
  </span>
</template>

<style scoped>
.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background-color: var(--color-primary-light, rgba(59, 130, 246, 0.1));
  color: var(--color-primary, #3b82f6);
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--color-primary-border, rgba(59, 130, 246, 0.2));
  white-space: nowrap;
}
</style>
