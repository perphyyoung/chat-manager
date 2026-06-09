<script setup lang="ts">
export interface MenuItem {
  icon?: string;
  text: string;
  action: () => void;
  visible?: boolean;
  danger?: boolean;
}

interface Props {
  show: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}

interface Emits {
  (e: "close"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const handleItemClick = (item: MenuItem) => {
  item.action();
  emit("close");
};

const handleClose = () => {
  emit("close");
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="context-menu-overlay"
      @click="handleClose"
      @contextmenu.prevent="handleClose"
    >
      <div
        class="context-menu"
        :style="{ left: `${x}px`, top: `${y}px` }"
        @click.stop
      >
        <div
          v-for="item in items.filter((i) => i.visible !== false)"
          :key="item.text"
          class="context-menu-item"
          :class="{ 'context-menu-item--danger': item.danger }"
          @click="handleItemClick(item)"
        >
          <span class="context-menu-icon">{{ item.icon }}</span>
          <span class="context-menu-text">{{ item.text }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 右键菜单 */
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10001;
}

.context-menu {
  position: fixed;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 120px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.context-menu-item:hover {
  background-color: var(--color-hover);
}

.context-menu-icon {
  font-size: 14px;
}

.context-menu-text {
  font-size: 13px;
  color: var(--color-text);
}

.context-menu-item--danger .context-menu-text {
  color: #ef4444;
}

.context-menu-item--danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
