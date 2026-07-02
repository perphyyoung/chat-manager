<script setup lang="ts">
import { ref, inject, computed } from "vue";
import ContextMenu, { type MenuItem } from "../common/ContextMenu.vue";

interface Props {
  text: string;
  questionId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  showInList: [questionId: string];
  showInDocumentList: [questionId: string];
}>();

const showToast = inject("showToast") as (message: string) => void;

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
});

const contextMenuItems = computed<MenuItem[]>(() => [
  {
    text: "复制",
    action: copyText,
  },
  {
    text: "在问题列表中显示",
    action: showInQuestionList,
  },
  {
    text: "在文档列表中显示",
    action: showInDocumentList,
  },
]);

function handleContextMenu(e: MouseEvent) {
  e.preventDefault();
  contextMenu.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
  };
}

function closeContextMenu() {
  contextMenu.value.show = false;
}

async function copyText() {
  await navigator.clipboard.writeText(props.text);
  showToast("问题已复制");
  closeContextMenu();
}

function showInQuestionList() {
  emit("showInList", props.questionId);
  closeContextMenu();
}

function showInDocumentList() {
  emit("showInDocumentList", props.questionId);
  closeContextMenu();
}
</script>

<template>
  <div class="question-bubble">
    <div
      class="question-bubble__content"
      @contextmenu="handleContextMenu"
    >
      {{ text }}
    </div>
    <!-- 右键菜单 -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @close="closeContextMenu"
    />
  </div>
</template>

<style scoped>
/* 问题气泡：右对齐，主题色背景，白色文字
 * 在浅色和深色主题下保持不变
 */
.question-bubble {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
  max-width: 70%;
}

.question-bubble__content {
  padding: 12px 16px;
  background-color: var(--color-primary); /* 主题色（蓝色/紫色等） */
  color: white; /* 固定白色文字 */
  border-radius: 12px 12px 12px 4px; /* 左上、左下、右下圆角，右上小圆角 */
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}
</style>
