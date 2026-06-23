<script setup lang="ts">
import { ref } from "vue";

interface DropdownItem {
  value: string;
  label: string;
}

interface Props {
  items: DropdownItem[];
  activeValue?: string;
}

interface Emits {
  (e: "select", value: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

// 状态管理
const isOpen = ref(false);
const triggerRect = ref<DOMRect | null>(null);

// 导出给父组件使用
const open = () => {
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

const toggle = (event: MouseEvent) => {
  if (isOpen.value) {
    close();
  } else {
    triggerRect.value = (event.currentTarget as HTMLElement).getBoundingClientRect();
    open();
  }
};

defineExpose({ isOpen, triggerRect, open, close, toggle });

const handleItemClick = (value: string) => {
  emit("select", value);
  close();
};

const handleClose = () => {
  close();
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen && triggerRect"
      class="dropdown-overlay"
      @click="handleClose"
      @contextmenu.prevent="handleClose"
    >
      <div
        class="dropdown-menu"
        :style="{
          left: `${triggerRect.left}px`,
          top: `${triggerRect.bottom + 4}px`,
        }"
        @click.stop
      >
        <button
          v-for="item in items"
          :key="item.value"
          class="dropdown-menu-item"
          :class="{ active: item.value === activeValue }"
          @click="handleItemClick(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10001;
}

.dropdown-menu {
  position: fixed;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 100px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  z-index: 10002;
}

.dropdown-menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background-color: transparent;
  color: var(--color-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.dropdown-menu-item:hover {
  background-color: var(--color-hover);
}

.dropdown-menu-item.active {
  color: var(--color-primary);
  font-weight: 500;
}
</style>
