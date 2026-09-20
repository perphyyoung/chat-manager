<script setup lang="ts">
import type {
  SearchResults,
  DocumentSearchResult,
  QuestionSearchResult,
  AnswerSearchResult,
  TagSearchResult,
} from "@/types/search";
import { escapeHtml, escapeRegex } from "../../utils/html";
interface SearchResult {
  id: string;
  type: "document" | "question" | "answer" | "tag";
  title?: string;
  content: string;
  metadata?: string;
  documentId?: string;
  questionId?: string;
}

const props = defineProps<{
  results: SearchResults;
  flatResults: SearchResult[];
  selectedIndex: number;
  query: string;
  regexMode: boolean;
}>();

const emit = defineEmits<{
  (e: "select", data: { item: SearchResult; searchText: string }): void;
  (e: "hover", index: number): void;
}>();

function highlight(text: string, query: string, regexMode: boolean): string {
  if (!regexMode) {
    if (!query.trim()) return escapeHtml(text);
    const escapedQuery = escapeHtml(query);
    const regex = new RegExp(`(${escapeRegex(escapedQuery)})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }
  // 正则模式：snippet 已在服务端按命中位置包 <mark>，避免用正则对标签文本二次匹配，直接返回
  if (text.includes("<mark>")) return text;
  // 无 snippet 的字段（文档标题/标签名等）用用户正则直接高亮，匹配片段转义防注入
  try {
    const regex = new RegExp(query, "gi");
    return text.replace(regex, (match) => `<mark>${escapeHtml(match)}</mark>`);
  } catch {
    return escapeHtml(text);
  }
}

function getTypeIcon(type: string): string {
  switch (type) {
    case "document":
      return "📄";
    case "question":
      return "❓";
    case "answer":
      return "💬";
    case "tag":
      return "🏷️";
    default:
      return "📄";
  }
}

function getTypeName(type: string): string {
  switch (type) {
    case "document":
      return "文档";
    case "question":
      return "问题";
    case "answer":
      return "回答";
    case "tag":
      return "标签";
    default:
      return type;
  }
}

function getItemsByType(
  type: string,
): Array<DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult> {
  switch (type) {
    case "document":
      return props.results.documents;
    case "question":
      return props.results.questions;
    case "answer":
      return props.results.answers;
    case "tag":
      return props.results.tags;
    default:
      return [];
  }
}

function getDisplayContent(
  item: DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult,
  type: string,
): string {
  switch (type) {
    case "document":
      return (item as DocumentSearchResult).title;
    case "question":
      return (item as QuestionSearchResult).text;
    case "answer": {
      const answer = item as AnswerSearchResult;
      if (answer.snippet) {
        return answer.snippet;
      }
      return answer.content.slice(0, 80) + (answer.content.length > 80 ? "..." : "");
    }
    case "tag":
      return (item as TagSearchResult).name;
    default:
      return String(item);
  }
}

function getMetadata(
  item: DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult,
  type: string,
): string {
  switch (type) {
    case "document":
      return `问题: ${(item as DocumentSearchResult).questionCount}  |  回答: ${(item as DocumentSearchResult).answerCount}`;
    case "question":
      return `来自: ${(item as QuestionSearchResult).documentTitle}`;
    case "answer":
      return `来自: ${(item as AnswerSearchResult).questionText}`;
    case "tag":
      return `关联文档: ${(item as TagSearchResult).documentCount}`;
    default:
      return "";
  }
}

function getDocumentId(
  item: DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult,
  type: string,
): string | undefined {
  switch (type) {
    case "document":
      return undefined;
    case "question":
      return (item as QuestionSearchResult).documentId;
    case "answer":
      return (item as AnswerSearchResult).documentId;
    case "tag":
      return undefined;
    default:
      return undefined;
  }
}

function getQuestionId(
  item: DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult,
  type: string,
): string | undefined {
  switch (type) {
    case "question":
      return (item as QuestionSearchResult).id;
    case "answer":
      return (item as AnswerSearchResult).questionId;
    default:
      return undefined;
  }
}

function getGlobalIndex(type: string, localIndex: number): number {
  let offset = 0;
  const types = ["document", "question", "answer", "tag"] as const;
  const typeIndex = types.indexOf(type as (typeof types)[number]);

  for (let i = 0; i < typeIndex; i++) {
    const t = types[i];
    if (t) {
      offset += getItemsByType(t).length;
    }
  }

  return offset + localIndex;
}

function handleClick(item: SearchResult) {
  emit("select", { item, searchText: props.query });
}
</script>

<template>
  <div class="search-results">
    <div
      v-for="type in ['document', 'question', 'answer', 'tag']"
      :key="type"
      class="search-results__group"
    >
      <template v-if="getItemsByType(type).length > 0">
        <div class="search-results__group-title">
          {{ getTypeIcon(type) }} {{ getTypeName(type) }}
          <span class="search-results__count">({{ getItemsByType(type).length }})</span>
        </div>
        <div class="search-results__items">
          <div
            v-for="(item, index) in getItemsByType(type)"
            :key="item.id"
            class="search-results__item"
            :class="{
              'search-results__item--selected': getGlobalIndex(type, index) === selectedIndex,
            }"
            @click="
              handleClick({
                id: item.id,
                type: type as 'document' | 'question' | 'answer' | 'tag',
                content: getDisplayContent(item, type),
                metadata: getMetadata(item, type),
                documentId: getDocumentId(item, type),
                questionId: getQuestionId(item, type),
              })
            "
            @mouseenter="emit('hover', getGlobalIndex(type, index))"
          >
            <div
              class="search-results__item-content"
              v-html="highlight(getDisplayContent(item, type), query, regexMode)"
            ></div>
            <div class="search-results__item-metadata">
              {{ getMetadata(item, type) }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.search-results {
  flex: 1;
  overflow-y: auto;
}

.search-results__group {
  padding: 12px 24px;
}

.search-results__group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-results__count {
  font-weight: normal;
  color: var(--color-text-secondary);
}

.search-results__items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 14px;
}

.search-results__item {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background 0.15s ease;
}

.search-results__item:hover,
.search-results__item--selected {
  background: var(--color-selected-bg);
  border-color: var(--color-primary, var(--color-border));
}

.search-results__item-content {
  font-size: 14px;
  color: var(--color-text);
  white-space: pre-line;
  word-break: break-word;
  line-height: 1.5;
  flex: 1;
}

.search-results__item-content :deep(mark) {
  background: var(--color-highlight-bg);
  padding: 1px 3px;
  border-radius: 2px;
}

.search-results__item-metadata {
  font-size: 12px;
  color: var(--color-text-secondary);
}

@media (max-width: 640px) {
  .search-results__items {
    grid-template-columns: 1fr;
  }
}
</style>
