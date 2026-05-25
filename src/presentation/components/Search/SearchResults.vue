<script setup lang="ts">
import type { SearchResults, DocumentSearchResult, QuestionSearchResult, AnswerSearchResult, TagSearchResult } from "../../../../env.d.ts";
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
}>();

const emit = defineEmits<{
  (e: "select", item: SearchResult): void;
  (e: "hover", index: number): void;
}>();

function highlight(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  const regex = new RegExp(`(${escapeRegex(escapedQuery)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
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

function getItemsByType(type: string): Array<DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult> {
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

function getDisplayContent(item: DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult, type: string): string {
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

function getMetadata(item: DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult, type: string): string {
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

function getDocumentId(item: DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult, type: string): string | undefined {
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

function getQuestionId(item: DocumentSearchResult | QuestionSearchResult | AnswerSearchResult | TagSearchResult, type: string): string | undefined {
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
  const typeIndex = types.indexOf(type as typeof types[number]);

  for (let i = 0; i < typeIndex; i++) {
    const t = types[i];
    if (t) {
      offset += getItemsByType(t).length;
    }
  }

  return offset + localIndex;
}

function handleClick(item: SearchResult) {
  emit("select", item);
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
        <div
          v-for="(item, index) in getItemsByType(type)"
          :key="item.id"
          class="search-results__item"
          :class="{ 'search-results__item--selected': getGlobalIndex(type, index) === selectedIndex }"
          @click="handleClick({ id: item.id, type: type as 'document' | 'question' | 'answer' | 'tag', content: getDisplayContent(item, type), metadata: getMetadata(item, type), documentId: getDocumentId(item, type), questionId: getQuestionId(item, type) })"
          @mouseenter="emit('hover', getGlobalIndex(type, index))"
        >
          <div
            class="search-results__item-content"
            v-html="highlight(getDisplayContent(item, type), query)"
          ></div>
          <div class="search-results__item-metadata">
            {{ getMetadata(item, type) }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.search-results {
  max-height: calc(70vh - 120px);
  overflow-y: auto;
}

.search-results__group {
  padding: 8px 16px;
}

.search-results__group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-results__count {
  font-weight: normal;
  color: var(--color-text-secondary);
}

.search-results__item {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 4px;
}

.search-results__item:hover,
.search-results__item--selected {
  background: var(--color-selected-bg);
}

.search-results__item:last-child {
  margin-bottom: 0;
}

.search-results__item-content {
  font-size: 14px;
  color: var(--color-text);
  margin-bottom: 4px;
  word-break: break-word;
}

.search-results__item-content :deep(mark) {
  background: var(--color-highlight-bg);
  padding: 0 2px;
  border-radius: 2px;
}

.search-results__item-metadata {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
