<script setup lang="ts">
import { ref } from "vue";
import DocumentList from "../Document/DocumentList.vue";
import ConversationView from "../Conversation/ConversationView.vue";
import QuestionList from "../Question/QuestionList.vue";

const MIN_WIDTH = 200;

const leftWidth = ref(280);
const rightWidth = ref(280);
const leftCollapsed = ref(false);
const rightCollapsed = ref(false);

const isDraggingLeft = ref(false);
const isDraggingRight = ref(false);

function onLeftResizeStart(e: PointerEvent) {
  isDraggingLeft.value = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  const startX = e.clientX;
  const startWidth = leftCollapsed.value ? 0 : leftWidth.value;

  function onPointerMove(e: PointerEvent) {
    const delta = e.clientX - startX;
    const newWidth = startWidth + delta;

    if (newWidth <= 0) {
      leftWidth.value = 0;
      leftCollapsed.value = true;
    } else if (newWidth < MIN_WIDTH) {
      leftWidth.value = MIN_WIDTH;
      leftCollapsed.value = false;
    } else {
      leftWidth.value = newWidth;
      leftCollapsed.value = false;
    }
  }

  function onPointerUp() {
    isDraggingLeft.value = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  }

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

function onRightResizeStart(e: PointerEvent) {
  isDraggingRight.value = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  const startX = e.clientX;
  const startWidth = rightCollapsed.value ? 0 : rightWidth.value;

  function onPointerMove(e: PointerEvent) {
    const delta = startX - e.clientX;
    const newWidth = startWidth + delta;

    if (newWidth <= 0) {
      rightWidth.value = 0;
      rightCollapsed.value = true;
    } else if (newWidth < MIN_WIDTH) {
      rightWidth.value = MIN_WIDTH;
      rightCollapsed.value = false;
    } else {
      rightWidth.value = newWidth;
      rightCollapsed.value = false;
    }
  }

  function onPointerUp() {
    isDraggingRight.value = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  }

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

function expandLeft() {
  leftWidth.value = 280;
  leftCollapsed.value = false;
}

function expandRight() {
  rightWidth.value = 280;
  rightCollapsed.value = false;
}
</script>

<template>
  <div class="three-column-layout">
    <aside
      v-show="!leftCollapsed"
      class="left-panel"
      :style="{ width: `${leftWidth}px` }"
    >
      <DocumentList />
    </aside>

    <div
      class="resize-handle"
      :class="{ 'is-dragging': isDraggingLeft, 'is-collapsed': leftCollapsed }"
      @pointerdown="onLeftResizeStart"
    >
      <div v-if="leftCollapsed" class="collapse-button left" @click.stop="expandLeft">
        <span class="collapse-icon">▶</span>
      </div>
      <div v-else class="resize-line" />
    </div>

    <main class="center-panel">
      <ConversationView />
    </main>

    <div
      class="resize-handle"
      :class="{ 'is-dragging': isDraggingRight, 'is-collapsed': rightCollapsed }"
      @pointerdown="onRightResizeStart"
    >
      <div v-if="rightCollapsed" class="collapse-button right" @click.stop="expandRight">
        <span class="collapse-icon">◀</span>
      </div>
      <div v-else class="resize-line" />
    </div>

    <aside
      v-show="!rightCollapsed"
      class="right-panel"
      :style="{ width: `${rightWidth}px` }"
    >
      <QuestionList />
    </aside>
  </div>
</template>

<style scoped>
.three-column-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.left-panel {
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.center-panel {
  flex: 1;
  overflow-y: auto;
  min-width: 400px;
}

.right-panel {
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
}

.resize-handle {
  width: 6px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  transition: background-color 0.15s;
  flex-shrink: 0;
  position: relative;
}

.resize-handle:hover:not(.is-collapsed),
.resize-handle.is-dragging:not(.is-collapsed) {
  background-color: var(--color-primary);
}

.resize-handle:hover:not(.is-collapsed) .resize-line,
.resize-handle.is-dragging:not(.is-collapsed) .resize-line {
  background-color: var(--color-primary);
}

.resize-line {
  width: 2px;
  height: 40px;
  background-color: var(--color-border);
  border-radius: 1px;
  transition: background-color 0.15s;
}

.resize-handle.is-collapsed {
  cursor: pointer;
  width: 20px;
}

.collapse-button {
  width: 16px;
  height: 48px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.collapse-button:hover {
  background-color: var(--color-hover);
  border-color: var(--color-primary);
}

.collapse-icon {
  font-size: 10px;
  color: var(--color-text-secondary);
}

.collapse-button.left .collapse-icon {
  margin-left: -2px;
}

.collapse-button.right .collapse-icon {
  margin-right: -2px;
}

@media (max-width: 768px) {
  .three-column-layout {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    width: 100% !important;
    min-width: 100% !important;
    height: 30vh;
    border-right: none;
    border-left: none;
    border-bottom: 1px solid var(--color-border);
  }

  .resize-handle {
    display: none;
  }

  .center-panel {
    min-width: 100%;
  }
}
</style>
