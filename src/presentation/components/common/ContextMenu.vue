<script setup lang="ts">
import { ref, nextTick, watch } from "vue";

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

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const menuRef = ref<HTMLElement | null>(null);
const adjustedPosition = ref({ left: 0, top: 0 });

watch(
  () => props.show,
  async (newVal) => {
    if (newVal) {
      await nextTick();
      adjustPosition();
    }
  },
);

const adjustPosition = () => {
  if (!menuRef.value) return;

  const menuWidth = menuRef.value.offsetWidth;
  const menuHeight = menuRef.value.offsetHeight;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = props.x;
  let top = props.y;

  // 水平翻转：右侧溢出但左侧有空间时翻转
  if (left + menuWidth > viewportWidth) {
    left = Math.max(0, left - menuWidth);
  }

  // 垂直翻转：下方溢出但上方有空间时翻转
  if (top + menuHeight > viewportHeight) {
    top = Math.max(0, top - menuHeight);
  }

  adjustedPosition.value = { left, top };
};

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
        ref="menuRef"
        class="context-menu"
        :style="{
          left: `${adjustedPosition.left}px`,
          top: `${adjustedPosition.top}px`,
        }"
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
  /* 挂载点可能早于其他浮层（如全屏编辑器遮罩），必须用最高档保证浮于其上 */
  z-index: var(--z-highest);
}

.context-menu {
  position: fixed;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 120px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
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
