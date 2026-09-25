<script setup lang="ts">
interface Props {
  name: string;
  /** sm 用于文档列表卡片（对齐 paim 卡片标签），md 用于筛选区与详情区 */
  size?: "sm" | "md";
  /** 关联文档数：渲染为名称左侧的蓝色徽章，0 不显示 */
  count?: number;
  /** 选中态：实心紫底（标签筛选区用） */
  active?: boolean;
  /** 需要点击/聚焦时渲染为 button，纯展示用 span */
  interactive?: boolean;
}

withDefaults(defineProps<Props>(), {
  size: "md",
  count: 0,
  active: false,
  interactive: false,
});
</script>

<template>
  <component
    :is="interactive ? 'button' : 'span'"
    :type="interactive ? 'button' : undefined"
    class="tag-badge"
    :class="{ 'tag-badge--sm': size === 'sm', 'tag-badge--active': active }"
  >
    <span v-if="count > 0" class="tag-badge__count">{{ count }}</span>
    <span class="tag-badge__name">{{ name }}</span>
  </component>
</template>

<style scoped>
/* 标签胶囊：几何尺寸与配色对齐 paim 的 TagChip；紫色硬编码，不随浅色/深色主题切换 */
.tag-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 4px;
  border-radius: 9999px;
  border: 1px solid rgba(192, 132, 252, 0.5);
  background-color: rgba(147, 51, 234, 0.25);
  color: #fff;
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
  transition:
    background-color 0.15s,
    border-color 0.15s;
}

/* button 根元素不继承字体，需显式声明 */
button.tag-badge {
  font-family: inherit;
  cursor: pointer;
}

/* md 档的垂直内边距（sm 档仅靠行高撑高，与 paim 卡片标签一致） */
.tag-badge:not(.tag-badge--sm) {
  padding-top: 2px;
  padding-bottom: 2px;
}

.tag-badge--sm {
  font-size: 10px;
}

.tag-badge--active {
  border-color: transparent;
  background-color: #a855f7;
}

.tag-badge:hover {
  border-color: rgba(216, 180, 254, 0.6);
}

/* 选中态 hover 保持无边框（与 paim solid 档一致） */
.tag-badge--active:hover {
  border-color: transparent;
  background-color: #c084fc;
}

/* 浅色主题（html 无 .dark）下底色为淡紫，白字不可读，改用深紫文字。
 * 整段选择器包进 :global()：只包前缀会丢掉 .tag-badge 并污染 <html> 的全局文字色 */
:global(html:not(.dark) .tag-badge) {
  color: #4c1d95;
}

/* 选中态是实心紫底，白字对比度优于深紫字，两主题都保持白字；须排在上一规则之后才能覆盖 */
:global(html:not(.dark) .tag-badge--active) {
  color: #fff;
}

/* 计数徽章恒为蓝底白字，选中与否都不变色 */
.tag-badge__count {
  flex-shrink: 0;
  margin-right: 4px;
  padding: 0 4px;
  border-radius: 9999px;
  background-color: #2563eb;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.tag-badge__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
