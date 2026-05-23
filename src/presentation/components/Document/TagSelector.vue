<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useDocumentStore } from "../../stores/document";
import TagBadge from "../common/TagBadge.vue";
import ConfirmDialog from "../common/ConfirmDialog.vue";

const documentStore = useDocumentStore();
const isOpen = ref(false);
const showNewTagInput = ref(false);
const newTagName = ref("");
const selectorRef = ref<HTMLElement | null>(null);

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

// 确认弹窗消息
const confirmMessage = computed(() => {
  if (!contextMenu.value.tagId) return "";
  return `确定要删除标签 "${contextMenu.value.tagName}" 吗？`;
});

const availableTags = computed(() => {
  if (!documentStore.selectedDocument) return [];
  return documentStore.allTags.filter(
    (tag) => !documentStore.selectedDocument!.tags.some((t) => t.id === tag.id),
  );
});

const hasAvailableTags = computed(() => availableTags.value.length > 0);

function toggle() {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) {
    showNewTagInput.value = false;
    newTagName.value = "";
  }
}

function close() {
  isOpen.value = false;
  showNewTagInput.value = false;
  newTagName.value = "";
}

async function addTag(tagId: string) {
  if (!documentStore.selectedDocument) return;
  await documentStore.addTagToDocument(
    documentStore.selectedDocument.id,
    tagId,
  );
  isOpen.value = false;
}

// 显示右键菜单
function showContextMenu(event: MouseEvent, tagId: string, tagName: string) {
  event.preventDefault();
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    tagId,
    tagName,
  };
}

// 关闭右键菜单
function closeContextMenu() {
  contextMenu.value.show = false;
}

// 请求删除标签（显示确认弹窗）
function requestDeleteTag() {
  showConfirmDialog.value = true;
  closeContextMenu();
}

// 确认删除标签
async function confirmDeleteTag() {
  if (!contextMenu.value.tagId || !documentStore.selectedDocument) return;
  await documentStore.removeTagFromDocument(
    documentStore.selectedDocument.id,
    contextMenu.value.tagId,
  );
  showConfirmDialog.value = false;
  contextMenu.value.tagId = "";
  contextMenu.value.tagName = "";
}

// 取消删除
function cancelDeleteTag() {
  showConfirmDialog.value = false;
  contextMenu.value.tagId = "";
  contextMenu.value.tagName = "";
}

async function createAndAddTag() {
  if (!newTagName.value.trim() || !documentStore.selectedDocument) return;
  const tag = await documentStore.createTag(newTagName.value.trim());
  if (tag) {
    await documentStore.addTagToDocument(
      documentStore.selectedDocument.id,
      tag.id,
    );
  }
  newTagName.value = "";
  showNewTagInput.value = false;
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  // 如果点击的是右键菜单，不关闭
  if (target.closest(".tag-context-menu")) {
    return;
  }
  if (selectorRef.value && !selectorRef.value.contains(target)) {
    close();
  }
  // 点击外部关闭右键菜单
  closeContextMenu();
}

onMounted(() => {
  // 使用 mousedown 而不是 click，避免与按钮点击冲突
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<template>
  <div ref="selectorRef" class="tag-selector">
    <div class="tag-selector__current">
      <TagBadge
        v-for="tag in documentStore.selectedDocument?.tags"
        :key="tag.id"
        :name="tag.name"
        @contextmenu="showContextMenu($event, tag.id, tag.name)"
      />
      <button
        class="tag-selector__toggle"
        @click="toggle"
        :disabled="!documentStore.selectedDocument"
      >
        {{ isOpen ? "关闭" : "+ 标签" }}
      </button>
    </div>

    <div v-if="isOpen" class="tag-selector__dropdown">
      <div v-if="hasAvailableTags" class="tag-selector__section">
        <div class="tag-selector__section-title">可选标签</div>
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

      <div
        v-if="!hasAvailableTags && !showNewTagInput"
        class="tag-selector__empty"
      >
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
          <button class="tag-selector__btn-confirm" @click="createAndAddTag">
            创建
          </button>
          <button
            class="tag-selector__btn-cancel"
            @click="showNewTagInput = false"
          >
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

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenu.show"
        class="tag-context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div
          class="tag-context-menu__item tag-context-menu__item--danger"
          @click="requestDeleteTag"
        >
          删除标签
        </div>
      </div>
    </Teleport>

    <!-- 删除标签确认弹窗 -->
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

.tag-selector__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  min-width: 200px;
  max-width: 280px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 100;
}

.tag-selector__section {
  margin-bottom: 12px;
}

.tag-selector__section:last-of-type {
  margin-bottom: 0;
}

.tag-selector__section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
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

/* 右键菜单样式 */
.tag-context-menu {
  position: fixed;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 10001;
  min-width: 120px;
}

.tag-context-menu__item {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  transition: background-color 0.2s;
}

.tag-context-menu__item:hover {
  background-color: var(--color-hover);
}

.tag-context-menu__item--danger {
  color: #ef4444;
}

.tag-context-menu__item--danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
