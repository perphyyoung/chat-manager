<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useDocumentStore } from "../../stores/document";
import ConfirmDialog from "../common/ConfirmDialog.vue";
import ContextMenu, { type MenuItem } from "../common/ContextMenu.vue";
import DropdownMenu from "../common/DropdownMenu.vue";

const documentStore = useDocumentStore();
const showNewTagInput = ref(false);
const newTagName = ref("");
const isCollapsed = ref(false);

// 排序状态
type SortField = "name" | "createdAt" | "count";
const sortField = ref<SortField>("name");
const sortReverse = ref(false);
const sortMenuRef = ref<InstanceType<typeof DropdownMenu> | null>(null);
const dropdownOpen = computed(() => sortMenuRef.value?.isOpen ?? false);

const sortFieldLabels: Record<SortField, string> = {
  name: "名称",
  createdAt: "创建时间",
  count: "数量",
};

const sortedTags = computed(() => {
  const tags = [...documentStore.allTags];
  const sorted = tags.sort((a, b) => {
    switch (sortField.value) {
      case "name":
        return a.name.localeCompare(b.name);
      case "createdAt":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "count":
        return (
          (documentStore.getTagDocumentCount(b.id) || 0) -
          (documentStore.getTagDocumentCount(a.id) || 0)
        );
      default:
        return 0;
    }
  });
  return sortReverse.value ? sorted.reverse() : sorted;
});

// 新标签输入框 ref，用于自动聚焦
const newTagInput = ref<HTMLInputElement | null>(null);

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
    text: "编辑标签",
    action: requestEditTag,
  },
  {
    text: "删除标签",
    action: requestDeleteTag,
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

// 编辑标签状态
const showEditInput = ref(false);
const editTagName = ref("");
const editingTagId = ref("");

// 确认弹窗消息
const confirmMessage = computed(() => {
  if (!currentTag.value.tagName) return "";
  return `确定要删除标签 "${currentTag.value.tagName}" 吗？这将从所有文档中移除该标签。`;
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
  event.preventDefault();
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
  };
  currentTag.value = { tagId, tagName };
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
  hideContextMenu();
  editingTagId.value = currentTag.value.tagId;
  editTagName.value = currentTag.value.tagName;
  showEditInput.value = true;
}

async function handleEditTag() {
  if (!editTagName.value.trim() || !editingTagId.value) {
    return;
  }
  await documentStore.updateTagName(
    editingTagId.value,
    editTagName.value.trim(),
  );
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
  currentTag.value.tagId = "";
  currentTag.value.tagName = "";
}

// 确认删除标签
async function confirmDeleteTag() {
  if (!currentTag.value.tagId) return;
  await documentStore.deleteTag(currentTag.value.tagId);
  showConfirmDialog.value = false;
  resetDeleteState();
}

// 取消删除
function cancelDeleteTag() {
  showConfirmDialog.value = false;
  resetDeleteState();
}
</script>

<template>
  <div class="tag-filter">
    <div class="tag-filter__header">
      <button
        class="tag-filter__toggle"
        @click="isCollapsed = !isCollapsed"
        :title="isCollapsed ? '展开' : '收起'"
      >
        <span
          class="tag-filter__toggle-icon"
          :class="{
            'tag-filter__toggle-icon--collapsed': isCollapsed,
          }"
          >▶</span
        >
        <span class="tag-filter__title">标签筛选</span>
      </button>
      <button
        v-if="!showNewTagInput && !showEditInput && !isCollapsed"
        class="tag-filter__add-btn"
        @click="showNewTagInput = true"
        title="新建标签"
      >
        +
      </button>
      <div
        v-if="!showNewTagInput && !showEditInput && !isCollapsed"
        class="sort-field-wrapper"
      >
        <button class="sort-field-btn" @click="sortMenuRef?.toggle">
          {{ sortFieldLabels[sortField] }}
          <svg
            class="dropdown-icon"
            :class="{ open: dropdownOpen }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <DropdownMenu
          ref="sortMenuRef"
          :items="Object.entries(sortFieldLabels).map(([value, label]) => ({ value, label }))"
          :active-value="sortField"
          @select="(v: string) => sortField = v as SortField"
        />
      </div>
      <button
        v-if="!showNewTagInput && !showEditInput && !isCollapsed"
        class="sort-order-btn"
        :title="sortReverse ? '升序' : '降序'"
        @click="sortReverse = !sortReverse"
      >
        <svg
          v-if="!sortReverse"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="5 12 12 19 19 12"></polyline>
        </svg>
      </button>
    </div>

    <div v-if="showNewTagInput" class="tag-filter__input-wrapper">
      <input
        ref="newTagInput"
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

    <div v-if="isCollapsed" class="tag-filter__collapsed-info">
      <span>共 {{ sortedTags.length }} 个标签</span>
    </div>

    <div v-else class="tag-filter__list">
      <button
        v-for="tag in sortedTags"
        :key="tag.id"
        class="tag-filter__item"
        :class="{
          'tag-filter__item--active': documentStore.selectedTagId === tag.id,
        }"
        @click="handleTagClick(tag.id)"
        @contextmenu="showContextMenu($event, tag.id, tag.name)"
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

    <!-- 排序下拉菜单 -->
    <DropdownMenu
      ref="sortMenuRef"
      :items="Object.entries(sortFieldLabels).map(([value, label]) => ({ value, label }))"
      :active-value="sortField"
      @select="(v: string) => sortField = v as SortField"
    />

    <!-- 右键菜单 -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @close="hideContextMenu"
    />

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

.tag-filter__toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color 0.2s;
}

.tag-filter__toggle:hover {
  color: var(--color-text);
}

.tag-filter__toggle-icon {
  font-size: 8px;
  transition: transform 0.2s;
  display: inline-block;
}

.tag-filter__toggle-icon--collapsed {
  transform: rotate(0deg);
}

.tag-filter__toggle-icon:not(.tag-filter__toggle-icon--collapsed) {
  transform: rotate(90deg);
}

.tag-filter__title {
  font-size: 12px;
  font-weight: 600;
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

.tag-filter__collapsed-info {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 4px 0;
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
</style>
