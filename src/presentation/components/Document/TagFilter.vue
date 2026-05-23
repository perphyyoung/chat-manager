<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useDocumentStore } from "../../stores/document";
import ConfirmDialog from "../common/ConfirmDialog.vue";

const documentStore = useDocumentStore();
const showNewTagInput = ref(false);
const newTagName = ref("");

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  tagId: "",
  tagName: "",
});

// 确认弹窗状态
const showConfirmDialog = ref(false);

// 编辑标签状态
const showEditInput = ref(false);
const editTagName = ref("");
const editingTagId = ref("");

// 确认弹窗消息
const confirmMessage = computed(() => {
  if (!contextMenu.value.tagName) return "";
  return `确定要删除标签 "${contextMenu.value.tagName}" 吗？这将从所有文档中移除该标签。`;
});

function handleTagClick(tagId: string | null) {
  // 再次点击已选中的标签则取消筛选
  if (documentStore.selectedTagId === tagId) {
    documentStore.setTagFilter(null);
  } else {
    documentStore.setTagFilter(tagId);
  }
}

async function handleCreateTag() {
  if (!newTagName.value.trim()) return;
  await documentStore.createTag(newTagName.value.trim());
  newTagName.value = "";
  showNewTagInput.value = false;
}

function handleCancel() {
  newTagName.value = "";
  showNewTagInput.value = false;
}

// 显示右键菜单
function showContextMenu(event: MouseEvent, tagId: string, tagName: string) {
  console.log(
    "[UI] showContextMenu called, tagId:",
    tagId,
    "tagName:",
    tagName,
  );
  event.preventDefault();
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    tagId,
    tagName,
  };
  console.log("[UI] contextMenu set to:", contextMenu.value);
}

// 隐藏右键菜单
function hideContextMenu() {
  contextMenu.value.show = false;
}

// 请求删除标签
function requestDeleteTag() {
  hideContextMenu();
  showConfirmDialog.value = true;
}

// 请求编辑标签
function requestEditTag() {
  console.log("[UI] requestEditTag called");
  hideContextMenu();
  editingTagId.value = contextMenu.value.tagId;
  editTagName.value = contextMenu.value.tagName;
  showEditInput.value = true;
  console.log(
    "[UI] showEditInput set to true, editingTagId:",
    editingTagId.value,
  );
}

async function handleEditTag() {
  console.log(
    "[UI] handleEditTag called, editingTagId:",
    editingTagId.value,
    "editTagName:",
    editTagName.value,
  );
  if (!editTagName.value.trim() || !editingTagId.value) {
    console.log("[UI] handleEditTag early return");
    return;
  }
  console.log("[UI] calling documentStore.updateTagName");
  await documentStore.updateTagName(
    editingTagId.value,
    editTagName.value.trim(),
  );
  console.log("[UI] documentStore.updateTagName completed");
  showEditInput.value = false;
  editTagName.value = "";
  editingTagId.value = "";
}

function handleEditCancel() {
  showEditInput.value = false;
  editTagName.value = "";
  editingTagId.value = "";
}

function resetDeleteState() {
  contextMenu.value.tagId = "";
  contextMenu.value.tagName = "";
}

// 确认删除标签
async function confirmDeleteTag() {
  if (!contextMenu.value.tagId) return;
  await documentStore.deleteTag(contextMenu.value.tagId);
  showConfirmDialog.value = false;
  resetDeleteState();
}

// 取消删除
function cancelDeleteTag() {
  showConfirmDialog.value = false;
  resetDeleteState();
}

// 点击外部隐藏菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest(".context-menu")) {
    hideContextMenu();
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="tag-filter">
    <div class="tag-filter__header">
      <span class="tag-filter__title">标签筛选</span>
      <button
        v-if="!showNewTagInput && !showEditInput"
        class="tag-filter__add-btn"
        @click="showNewTagInput = true"
        title="新建标签"
      >
        +
      </button>
    </div>

    <div v-if="showNewTagInput" class="tag-filter__input-wrapper">
      <input
        v-model="newTagName"
        type="text"
        placeholder="标签名称"
        class="tag-filter__input"
        @keyup.enter="handleCreateTag"
        @keyup.esc="handleCancel"
      />
      <div class="tag-filter__input-actions">
        <button class="tag-filter__btn-confirm" @click="handleCreateTag">
          确定
        </button>
        <button class="tag-filter__btn-cancel" @click="handleCancel">
          取消
        </button>
      </div>
    </div>

    <div v-if="showEditInput" class="tag-filter__input-wrapper">
      <input
        v-model="editTagName"
        type="text"
        placeholder="新标签名称"
        class="tag-filter__input"
        @keyup.enter="handleEditTag"
        @keyup.esc="handleEditCancel"
      />
      <div class="tag-filter__input-actions">
        <button class="tag-filter__btn-confirm" @click="handleEditTag">
          保存
        </button>
        <button class="tag-filter__btn-cancel" @click="handleEditCancel">
          取消
        </button>
      </div>
    </div>

    <div class="tag-filter__list">
      <button
        v-for="tag in documentStore.allTags"
        :key="tag.id"
        class="tag-filter__item"
        :class="{
          'tag-filter__item--active': documentStore.selectedTagId === tag.id,
        }"
        @click="handleTagClick(tag.id)"
        @contextmenu.prevent="showContextMenu($event, tag.id, tag.name)"
      >
        <span class="tag-filter__name">{{ tag.name }}</span>
        <span
          class="tag-filter__count"
          v-if="documentStore.getTagDocumentCount(tag.id) > 0"
        >
          {{ documentStore.getTagDocumentCount(tag.id) }}
        </span>
      </button>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <button class="context-menu__item" @click="requestEditTag">
        编辑标签
      </button>
      <button
        class="context-menu__item context-menu__item--danger"
        @click="requestDeleteTag"
      >
        删除标签
      </button>
    </div>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :show="showConfirmDialog"
      title="确认删除标签"
      :message="confirmMessage"
      @confirm="confirmDeleteTag"
      @cancel="cancelDeleteTag"
    />
  </div>
</template>

<style scoped>
.tag-filter {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.tag-filter__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tag-filter__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-filter__add-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.tag-filter__add-btn:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.tag-filter__input-wrapper {
  margin-bottom: 8px;
}

.tag-filter__input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  background-color: var(--color-background);
  color: var(--color-text);
  box-sizing: border-box;
  margin-bottom: 6px;
}

.tag-filter__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.tag-filter__input-actions {
  display: flex;
  gap: 8px;
}

.tag-filter__btn-confirm,
.tag-filter__btn-cancel {
  flex: 1;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.tag-filter__btn-confirm {
  background-color: var(--color-primary);
  color: white;
}

.tag-filter__btn-cancel {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.tag-filter__btn-confirm:hover,
.tag-filter__btn-cancel:hover {
  opacity: 0.9;
}

.tag-filter__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-filter__item {
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
  cursor: pointer;
  transition: all 0.2s;
}

.tag-filter__item:hover {
  opacity: 0.8;
}

.tag-filter__item--active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.tag-filter__item--active:hover {
  opacity: 0.9;
}

.tag-filter__name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-filter__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background-color: var(--color-primary, #3b82f6);
  color: white;
  border-radius: 7px;
  font-size: 9px;
  font-weight: 600;
  flex-shrink: 0;
}

.tag-filter__item--active .tag-filter__count {
  background-color: rgba(255, 255, 255, 0.9);
  color: var(--color-primary, #3b82f6);
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 1000;
  min-width: 100px;
}

.context-menu__item {
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
}

.context-menu__item:hover {
  background-color: var(--color-hover);
}

.context-menu__item--danger {
  color: #ef4444;
}

.context-menu__item--danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
