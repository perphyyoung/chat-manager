<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useDocumentStore } from "../../stores/document";
import TagBadge from "../common/TagBadge.vue";
import ConfirmDialog from "../common/ConfirmDialog.vue";
import ContextMenu, { type MenuItem } from "../common/ContextMenu.vue";

const documentStore = useDocumentStore();
const isOpen = ref(false);
const showNewTagInput = ref(false);
const newTagName = ref("");
const toggleBtnRef = ref<HTMLButtonElement | null>(null);
const newTagInput = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref({ top: "0px", left: "0px" });

// 显示新标签输入框时自动聚焦
watch(showNewTagInput, async (show) => {
  if (show) {
    await nextTick();
    newTagInput.value?.focus();
  }
});

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
});

// 右键菜单项
const contextMenuItems = computed<MenuItem[]>(() => [
  {
    text: "取消标签关联",
    action: requestUnlinkTag,
    danger: true,
  },
]);

// 当前右键选中的标签信息
const currentTag = ref({
  tagId: "",
  tagName: "",
});

// 确认弹窗状态
const showConfirmDialog = ref(false);

// 确认弹窗消息
const confirmMessage = computed(() => {
  if (!currentTag.value.tagId) return "";
  return `确定要取消文档与标签 "${currentTag.value.tagName}" 的关联吗？`;
});

const availableTags = computed(() => {
  if (!documentStore.selectedDocument) return [];
  return documentStore.allTags
    .filter((tag) => !documentStore.selectedDocument!.tags.some((t) => t.id === tag.id))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const hasAvailableTags = computed(() => availableTags.value.length > 0);

function toggle() {
  if (isOpen.value) {
    isOpen.value = false;
    showNewTagInput.value = false;
    newTagName.value = "";
  } else {
    if (toggleBtnRef.value) {
      const rect = toggleBtnRef.value.getBoundingClientRect();
      dropdownStyle.value = {
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
      };
    }
    isOpen.value = true;
  }
}

function close() {
  isOpen.value = false;
  showNewTagInput.value = false;
  newTagName.value = "";
}

// 点击遮罩关闭面板，但新建标签输入时保留输入内容不关闭
function handleOverlayClick() {
  if (!showNewTagInput.value) {
    close();
  }
}

async function addTag(tagId: string) {
  if (!documentStore.selectedDocument) return;
  await documentStore.addTagToDocument(documentStore.selectedDocument.id, tagId);
  isOpen.value = false;
}

// 显示右键菜单
function showContextMenu(event: MouseEvent, tagId: string, tagName: string) {
  event.preventDefault();
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
  };
  currentTag.value = { tagId, tagName };
}

// 关闭右键菜单
function closeContextMenu() {
  contextMenu.value.show = false;
}

// 请求取消标签关联（显示确认弹窗）
function requestUnlinkTag() {
  showConfirmDialog.value = true;
  closeContextMenu();
}

// 确认取消标签关联
async function confirmUnlinkTag() {
  if (!currentTag.value.tagId || !documentStore.selectedDocument) return;
  await documentStore.removeTagFromDocument(
    documentStore.selectedDocument.id,
    currentTag.value.tagId,
  );
  showConfirmDialog.value = false;
  currentTag.value.tagId = "";
  currentTag.value.tagName = "";
}

// 放弃取消标签关联
function cancelUnlinkTag() {
  showConfirmDialog.value = false;
  currentTag.value.tagId = "";
  currentTag.value.tagName = "";
}

async function createAndAddTag() {
  if (!newTagName.value.trim() || !documentStore.selectedDocument) return;
  const tag = await documentStore.createTag(newTagName.value.trim());
  if (tag) {
    await documentStore.addTagToDocument(documentStore.selectedDocument.id, tag.id);
  }
  newTagName.value = "";
  showNewTagInput.value = false;
  isOpen.value = false;
}
</script>

<template>
  <div class="tag-selector">
    <div class="tag-selector__current">
      <TagBadge
        v-for="tag in documentStore.selectedDocument?.tags"
        :key="tag.id"
        :name="tag.name"
        @contextmenu="showContextMenu($event, tag.id, tag.name)"
      />
      <button
        ref="toggleBtnRef"
        class="tag-selector__toggle"
        @click="toggle"
        :disabled="!documentStore.selectedDocument"
      >
        + 标签
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="tag-selector-overlay"
        @click="handleOverlayClick"
        @contextmenu.prevent="close"
      >
        <div class="tag-selector__dropdown" :style="dropdownStyle" @click.stop>
          <div class="tag-selector__header">
            <span class="tag-selector__header-title">可选标签</span>
            <button class="tag-selector__close-x" @click="close" title="关闭">×</button>
          </div>
          <div v-if="hasAvailableTags" class="tag-selector__section">
            <div class="tag-selector__list">
              <button
                v-for="tag in availableTags"
                :key="tag.id"
                class="tag-selector__option"
                @click="addTag(tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>
          </div>

          <div v-if="!hasAvailableTags && !showNewTagInput" class="tag-selector__empty">
            没有更多可选标签
          </div>

          <div v-if="showNewTagInput" class="tag-selector__new">
            <input
              v-model="newTagName"
              type="text"
              placeholder="新标签名称"
              class="tag-selector__input"
              @keyup.enter="createAndAddTag"
              @keyup.esc="showNewTagInput = false"
              ref="newTagInput"
            />
            <div class="tag-selector__actions">
              <button class="tag-selector__btn-confirm" @click="createAndAddTag">创建</button>
              <button class="tag-selector__btn-cancel" @click="showNewTagInput = false">
                取消
              </button>
            </div>
          </div>

          <button
            v-if="!showNewTagInput"
            class="tag-selector__create-btn"
            @click="showNewTagInput = true"
          >
            + 创建新标签
          </button>
        </div>
      </div>
    </Teleport>

    <!-- 右键菜单 -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @close="closeContextMenu"
    />

    <!-- 删除标签确认弹窗 -->
    <ConfirmDialog
      :show="showConfirmDialog"
      title="取消标签关联"
      :message="confirmMessage"
      @confirm="confirmUnlinkTag"
      @cancel="cancelUnlinkTag"
    />
  </div>
</template>

<style scoped>
.tag-selector {
  position: relative;
}

.tag-selector__current {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-selector__toggle {
  padding: 2px 8px;
  border: 1px dashed var(--color-border);
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-selector__toggle:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tag-selector__toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tag-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-overlay);
}

.tag-selector__dropdown {
  position: fixed;
  min-width: 200px;
  max-width: 280px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
}

.tag-selector__section {
  margin-bottom: 12px;
}

.tag-selector__section:last-of-type {
  margin-bottom: 0;
}

.tag-selector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tag-selector__header-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-selector__close-x {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
  border-radius: 4px;
  transition: all 0.2s;
}

.tag-selector__close-x:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.tag-selector__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-selector__option {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-selector__option:hover {
  background-color: var(--color-hover);
  border-color: var(--color-primary);
}

.tag-selector__empty {
  padding: 12px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.tag-selector__new {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.tag-selector__input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  background-color: var(--color-background);
  color: var(--color-text);
  box-sizing: border-box;
  margin-bottom: 8px;
}

.tag-selector__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.tag-selector__actions {
  display: flex;
  gap: 8px;
}

.tag-selector__btn-confirm,
.tag-selector__btn-cancel {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.tag-selector__btn-confirm {
  background-color: var(--color-primary);
  color: white;
}

.tag-selector__btn-cancel {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.tag-selector__create-btn {
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-selector__create-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
