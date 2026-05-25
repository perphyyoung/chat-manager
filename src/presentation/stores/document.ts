import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { Document, Tag } from "@/domain/entities";
import { DocumentApplicationService } from "@/application/services/DocumentApplicationService";
import { AnswerApplicationService } from "@/application/services/AnswerApplicationService";
import { TagApplicationService } from "@/application/services/TagApplicationService";
import { SqliteDocumentRepository } from "@/infrastructure/storage/SqliteDocumentRepository";
import { SqliteAnswerRepository } from "@/infrastructure/storage/SqliteAnswerRepository";
import { SqliteTagRepository } from "@/infrastructure/storage/SqliteTagRepository";
import { globalEventBus } from "@/domain/events";
import { mockDocuments } from "@/infrastructure/data/mockData";

const documentRepo = new SqliteDocumentRepository();
const answerRepo = new SqliteAnswerRepository();
const tagRepo = new SqliteTagRepository();
const documentService = new DocumentApplicationService(
  documentRepo,
  globalEventBus,
);
const answerService = new AnswerApplicationService(
  documentRepo,
  answerRepo,
  globalEventBus,
);
const tagService = new TagApplicationService(
  tagRepo,
  documentRepo,
  globalEventBus,
);

export type SortField = "createdAt" | "updatedAt" | "title";
export type QuestionSortField = SortField | "sortOrder";
export type SortOrder = "asc" | "desc";

interface SortPreferences {
  documentSortField: SortField;
  documentSortOrder: SortOrder;
  questionSortField: QuestionSortField;
  questionSortOrder: SortOrder;
}

const STORAGE_KEY = "chat-manager-sort-preferences";

function loadSortPreferences(): SortPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SortPreferences;
      // 验证值是否有效
      const validFields: SortField[] = ["createdAt", "updatedAt", "title"];
      const validQuestionFields: QuestionSortField[] = [
        "createdAt",
        "updatedAt",
        "title",
        "sortOrder",
      ];
      const validOrders: SortOrder[] = ["asc", "desc"];
      if (
        validFields.includes(parsed.documentSortField) &&
        validOrders.includes(parsed.documentSortOrder) &&
        validQuestionFields.includes(parsed.questionSortField) &&
        validOrders.includes(parsed.questionSortOrder)
      ) {
        return parsed;
      }
    }
  } catch {
    // 解析失败使用默认值
  }
  return {
    documentSortField: "createdAt",
    documentSortOrder: "desc",
    questionSortField: "sortOrder",
    questionSortOrder: "asc",
  };
}

function saveSortPreferences(preferences: SortPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // 保存失败静默处理
  }
}

export const useDocumentStore = defineStore("document", () => {
  const documents = ref<Document[]>([]);
  const selectedDocumentId = ref<string | null>(null);
  const activeQuestionId = ref<string | null>(null);

  // 标签相关状态
  const allTags = ref<Tag[]>([]);
  const selectedTagId = ref<string | null>(null);

  // 问题回收站状态
  const deletedQuestions = ref<
    Array<{ id: string; text: string; deletedAt: Date }>
  >([]);

  // 搜索高亮状态
  const highlightText = ref<string | null>(null);
  let highlightTimer: ReturnType<typeof setTimeout> | null = null;

  // 从本地存储加载排序偏好
  const savedPreferences = loadSortPreferences();

  // 文档排序状态
  const documentSortField = ref<SortField>(savedPreferences.documentSortField);
  const documentSortOrder = ref<SortOrder>(savedPreferences.documentSortOrder);

  // 问题排序状态
  const questionSortField = ref<QuestionSortField>(
    savedPreferences.questionSortField,
  );
  const questionSortOrder = ref<SortOrder>(savedPreferences.questionSortOrder);

  const selectedDocument = computed(() => {
    return (
      documents.value.find((doc) => doc.id === selectedDocumentId.value) || null
    );
  });

  const selectedDocumentQuestions = computed(() => {
    const questions = selectedDocument.value?.questions || [];
    return sortQuestions(
      questions,
      questionSortField.value,
      questionSortOrder.value,
    );
  });

  const sortedDocuments = computed(() => {
    let filteredDocs = documents.value;
    // 如果有选中的标签，筛选文档
    if (selectedTagId.value) {
      filteredDocs = documents.value.filter((doc) =>
        doc.tags.some((tag) => tag.id === selectedTagId.value),
      );
    }
    return sortDocuments(
      filteredDocs,
      documentSortField.value,
      documentSortOrder.value,
    );
  });

  function selectDocument(id: string) {
    selectedDocumentId.value = id;
    activeQuestionId.value = null;
    documentService.selectDocument(id).catch(() => {});
    loadDeletedQuestions().catch(() => {});
  }

  function setActiveQuestion(id: string | null) {
    activeQuestionId.value = id;
    if (id && selectedDocumentId.value) {
      documentService
        .selectQuestion(selectedDocumentId.value, id)
        .catch(() => {});
    }
  }

  function setHighlightText(text: string, duration = 3000) {
    highlightText.value = text;
    if (highlightTimer) {
      clearTimeout(highlightTimer);
    }
    highlightTimer = setTimeout(() => {
      highlightText.value = null;
    }, duration);
  }

  function clearHighlightText() {
    highlightText.value = null;
    if (highlightTimer) {
      clearTimeout(highlightTimer);
      highlightTimer = null;
    }
  }

  function initDocuments(docs: Document[]) {
    documents.value = docs;
  }

  async function loadDocuments() {
    const docs = await documentService.loadAllDocuments();
    if (docs.length === 0) {
      for (const mock of mockDocuments) {
        await documentRepo.save(mock);
      }
      documents.value = mockDocuments;
    } else {
      documents.value = docs;
    }
    // 自动选中排序后的第一个文档
    const sorted = sortDocuments(
      documents.value,
      documentSortField.value,
      documentSortOrder.value,
    );
    if (sorted.length > 0 && !selectedDocumentId.value) {
      selectDocument(sorted[0]!.id);
    }
  }

  async function createDocument(title: string): Promise<void> {
    const doc = await documentService.createDocument(title);
    documents.value.push(doc);
    selectDocument(doc.id);
  }

  async function updateDocumentTitle(
    documentId: string,
    newTitle: string,
  ): Promise<void> {
    await documentService.updateDocumentTitle(documentId, newTitle);
    // 刷新文档列表
    const updatedDoc = await documentService.getDocument(documentId);
    if (updatedDoc) {
      const index = documents.value.findIndex((d) => d.id === documentId);
      if (index !== -1) {
        // 使用 splice 替换元素以触发响应式更新
        documents.value.splice(index, 1, updatedDoc);
      }
    }
  }

  async function deleteDocument(documentId: string): Promise<void> {
    await documentService.deleteDocument(documentId);
    // 从列表中移除
    const index = documents.value.findIndex((d) => d.id === documentId);
    if (index !== -1) {
      documents.value.splice(index, 1);
    }
    // 如果删除的是当前选中的文档，清空选中状态
    if (selectedDocumentId.value === documentId) {
      selectedDocumentId.value = null;
      activeQuestionId.value = null;
      // 自动选中下一个文档（如果存在）
      if (documents.value.length > 0) {
        const sorted = sortDocuments(
          documents.value,
          documentSortField.value,
          documentSortOrder.value,
        );
        if (sorted.length > 0) {
          selectDocument(sorted[0]!.id);
        }
      }
    }
  }

  async function addQuestionAndAnswer(
    questionText: string,
    answerContent: string,
  ): Promise<void> {
    if (!selectedDocumentId.value) {
      throw new Error("No document selected");
    }
    const docId = selectedDocumentId.value;
    await documentService.addQuestion(docId, questionText);
    const updatedDoc = await documentService.getDocument(docId);
    if (!updatedDoc) {
      throw new Error("Document not found after adding question");
    }
    // 找到新添加的问题（最后一个）
    const newQuestion = updatedDoc.questions[updatedDoc.questions.length - 1];
    if (!newQuestion) {
      throw new Error("Failed to add question");
    }
    await answerService.addAnswer(docId, newQuestion.id, answerContent);
    // 刷新当前文档数据
    const finalDoc = await documentService.getDocument(docId);
    if (finalDoc) {
      const index = documents.value.findIndex((d) => d.id === docId);
      if (index !== -1) {
        documents.value[index] = finalDoc;
      }
    }
    setActiveQuestion(newQuestion.id);
  }

  async function updateAnswerContent(
    answerId: string,
    content: string,
  ): Promise<void> {
    if (!selectedDocumentId.value) {
      throw new Error("No document selected");
    }
    const docId = selectedDocumentId.value;
    await answerService.updateAnswer(docId, answerId, content);
    // 刷新当前文档数据
    const updatedDoc = await documentService.getDocument(docId);
    if (updatedDoc) {
      const index = documents.value.findIndex((d) => d.id === docId);
      if (index !== -1) {
        documents.value.splice(index, 1, updatedDoc);
      }
    }
  }

  // 删除问题及其对应的回答
  async function deleteQuestionAndAnswer(questionId: string): Promise<void> {
    if (!selectedDocumentId.value) {
      throw new Error("No document selected");
    }
    const docId = selectedDocumentId.value;

    // 获取当前文档
    const doc = selectedDocument.value;
    if (!doc) {
      throw new Error("Document not found");
    }

    // 查找对应的回答
    const answer = doc.getAnswerByQuestionId(questionId);

    // 先删除回答（如果存在）
    if (answer) {
      await answerService.deleteAnswer(docId, answer.id);
    }

    // 再删除问题
    await documentService.deleteQuestion(docId, questionId);

    // 刷新当前文档数据
    const updatedDoc = await documentService.getDocument(docId);
    if (updatedDoc) {
      const index = documents.value.findIndex((d) => d.id === docId);
      if (index !== -1) {
        documents.value.splice(index, 1, updatedDoc);
      }
    }

    // 如果删除的是当前选中的问题，清空选中状态
    if (activeQuestionId.value === questionId) {
      activeQuestionId.value = null;
    }
  }

  // 更新问题文本
  async function updateQuestionText(
    questionId: string,
    newText: string,
  ): Promise<void> {
    if (!selectedDocumentId.value) {
      throw new Error("No document selected");
    }
    const docId = selectedDocumentId.value;
    await documentService.updateQuestionText(docId, questionId, newText);
    // 刷新当前文档数据
    const updatedDoc = await documentService.getDocument(docId);
    if (updatedDoc) {
      const index = documents.value.findIndex((d) => d.id === docId);
      if (index !== -1) {
        documents.value.splice(index, 1, updatedDoc);
      }
    }
  }

  // 排序相关函数
  function setDocumentSortField(field: SortField) {
    documentSortField.value = field;
    saveSortPreferences({
      documentSortField: field,
      documentSortOrder: documentSortOrder.value,
      questionSortField: questionSortField.value,
      questionSortOrder: questionSortOrder.value,
    });
  }

  function setDocumentSortOrder(order: SortOrder) {
    documentSortOrder.value = order;
    saveSortPreferences({
      documentSortField: documentSortField.value,
      documentSortOrder: order,
      questionSortField: questionSortField.value,
      questionSortOrder: questionSortOrder.value,
    });
  }

  function toggleDocumentSortOrder() {
    const newOrder = documentSortOrder.value === "asc" ? "desc" : "asc";
    documentSortOrder.value = newOrder;
    saveSortPreferences({
      documentSortField: documentSortField.value,
      documentSortOrder: newOrder,
      questionSortField: questionSortField.value,
      questionSortOrder: questionSortOrder.value,
    });
  }

  function setQuestionSortField(field: QuestionSortField) {
    questionSortField.value = field;
    saveSortPreferences({
      documentSortField: documentSortField.value,
      documentSortOrder: documentSortOrder.value,
      questionSortField: field,
      questionSortOrder: questionSortOrder.value,
    });
  }

  function setQuestionSortOrder(order: SortOrder) {
    questionSortOrder.value = order;
    saveSortPreferences({
      documentSortField: documentSortField.value,
      documentSortOrder: documentSortOrder.value,
      questionSortField: questionSortField.value,
      questionSortOrder: order,
    });
  }

  function toggleQuestionSortOrder() {
    const newOrder = questionSortOrder.value === "asc" ? "desc" : "asc";
    questionSortOrder.value = newOrder;
    saveSortPreferences({
      documentSortField: documentSortField.value,
      documentSortOrder: documentSortOrder.value,
      questionSortField: questionSortField.value,
      questionSortOrder: newOrder,
    });
  }

  // 回收站相关方法（使用数据库软删除）
  async function softDeleteDocument(documentId: string) {
    await documentRepo.softDelete(documentId);

    // 从文档列表中移除
    const index = documents.value.findIndex((d) => d.id === documentId);
    if (index !== -1) {
      documents.value.splice(index, 1);
    }

    // 如果删除的是当前选中的文档，清空选中状态
    if (selectedDocumentId.value === documentId) {
      selectedDocumentId.value = null;
      activeQuestionId.value = null;
    }
  }

  async function loadDeletedDocuments(): Promise<Document[]> {
    return documentRepo.findAllDeleted();
  }

  async function restoreDocument(documentId: string) {
    await documentRepo.restore(documentId);
  }

  async function permanentlyDeleteDocument(documentId: string) {
    await documentRepo.delete(documentId);
  }

  // 问题回收站相关方法
  async function softDeleteQuestion(questionId: string): Promise<void> {
    if (!selectedDocumentId.value) {
      throw new Error("No document selected");
    }
    const docId = selectedDocumentId.value;

    // 获取当前文档
    const doc = selectedDocument.value;
    if (!doc) {
      throw new Error("Document not found");
    }

    // 软删除问题
    await documentRepo.softDeleteQuestion(docId, questionId);

    // 刷新当前文档数据
    const updatedDoc = await documentService.getDocument(docId);
    if (updatedDoc) {
      const index = documents.value.findIndex((d) => d.id === docId);
      if (index !== -1) {
        documents.value.splice(index, 1, updatedDoc);
      }
    }

    // 如果删除的是当前选中的问题，清空选中状态
    if (activeQuestionId.value === questionId) {
      activeQuestionId.value = null;
    }
  }

  async function loadDeletedQuestions(): Promise<void> {
    if (!selectedDocumentId.value) {
      deletedQuestions.value = [];
      return;
    }
    deletedQuestions.value = await documentRepo.getDeletedQuestions(
      selectedDocumentId.value,
    );
  }

  async function restoreQuestion(questionId: string): Promise<void> {
    if (!selectedDocumentId.value) {
      throw new Error("No document selected");
    }
    const docId = selectedDocumentId.value;

    await documentRepo.restoreQuestion(docId, questionId);

    // 刷新当前文档数据
    const updatedDoc = await documentService.getDocument(docId);
    if (updatedDoc) {
      const index = documents.value.findIndex((d) => d.id === docId);
      if (index !== -1) {
        documents.value.splice(index, 1, updatedDoc);
      }
    }

    // 刷新回收站列表
    await loadDeletedQuestions();
  }

  async function permanentlyDeleteQuestion(questionId: string): Promise<void> {
    if (!selectedDocumentId.value) {
      throw new Error("No document selected");
    }
    const docId = selectedDocumentId.value;

    await documentRepo.permanentlyDeleteQuestion(docId, questionId);

    // 刷新回收站列表
    await loadDeletedQuestions();
  }

  async function clearDeletedQuestions(): Promise<void> {
    if (!selectedDocumentId.value) {
      return;
    }
    const docId = selectedDocumentId.value;

    await documentRepo.clearDeletedQuestions(docId);

    // 刷新回收站列表
    deletedQuestions.value = [];
  }

  const deletedQuestionCount = computed(() => deletedQuestions.value.length);

  // 标签相关方法
  async function loadTags(): Promise<void> {
    const tags = await tagService.getAllTags();
    allTags.value = tags;
  }

  async function createTag(name: string): Promise<Tag | null> {
    try {
      const tag = await tagService.createTag(name);
      await loadTags();
      return tag;
    } catch (error) {
      console.error("Failed to create tag:", error);
      return null;
    }
  }

  async function deleteTag(tagId: string): Promise<void> {
    await tagService.deleteTag(tagId);
    await loadTags();
    // 重新加载文档以更新标签关联
    await loadDocuments();
  }

  function setTagFilter(tagId: string | null): void {
    selectedTagId.value = tagId;
  }

  async function addTagToDocument(
    documentId: string,
    tagId: string,
  ): Promise<void> {
    console.log(
      "[STORE] addTagToDocument called, docId:",
      documentId,
      "tagId:",
      tagId,
    );
    await tagService.addTagToDocument(documentId, tagId);
    console.log("[STORE] tagService.addTagToDocument completed");
    // 刷新文档数据
    const updatedDoc = await documentService.getDocument(documentId);
    console.log(
      "[STORE] Refreshed document, tags:",
      updatedDoc?.tags.length,
      updatedDoc?.tags.map((t) => t.name),
    );
    if (updatedDoc) {
      const index = documents.value.findIndex((d) => d.id === documentId);
      if (index !== -1) {
        documents.value.splice(index, 1, updatedDoc);
        console.log("[STORE] Updated document in store, index:", index);
      } else {
        console.log("[STORE] Document not found in store");
      }
    }
  }

  async function removeTagFromDocument(
    documentId: string,
    tagId: string,
  ): Promise<void> {
    await tagService.removeTagFromDocument(documentId, tagId);
    // 刷新文档数据
    const updatedDoc = await documentService.getDocument(documentId);
    if (updatedDoc) {
      const index = documents.value.findIndex((d) => d.id === documentId);
      if (index !== -1) {
        documents.value.splice(index, 1, updatedDoc);
      }
    }
  }

  // 获取标签关联的文档数量
  function getTagDocumentCount(tagId: string): number {
    return documents.value.filter((doc) =>
      doc.tags.some((tag) => tag.id === tagId),
    ).length;
  }

  async function updateTagName(tagId: string, newName: string): Promise<void> {
    console.log(
      "[STORE] updateTagName called, tagId:",
      tagId,
      "newName:",
      newName,
    );
    await tagService.updateTagName(tagId, newName);
    console.log("[STORE] tagService.updateTagName completed");
    // 刷新标签列表
    await loadTags();
    console.log("[STORE] loadTags completed");
    // 刷新所有文档数据（因为标签名可能在多个文档中）
    await loadDocuments();
    console.log("[STORE] loadDocuments completed");
  }

  return {
    documents,
    sortedDocuments,
    selectedDocumentId,
    activeQuestionId,
    highlightText,
    selectedDocument,
    selectedDocumentQuestions,
    documentSortField,
    documentSortOrder,
    questionSortField,
    questionSortOrder,
    // 标签相关
    allTags,
    selectedTagId,
    loadTags,
    createTag,
    deleteTag,
    updateTagName,
    setTagFilter,
    addTagToDocument,
    removeTagFromDocument,
    getTagDocumentCount,
    selectDocument,
    setActiveQuestion,
    setHighlightText,
    clearHighlightText,
    initDocuments,
    loadDocuments,
    createDocument,
    updateDocumentTitle,
    deleteDocument,
    addQuestionAndAnswer,
    updateAnswerContent,
    deleteQuestionAndAnswer,
    updateQuestionText,
    setDocumentSortField,
    setDocumentSortOrder,
    toggleDocumentSortOrder,
    setQuestionSortField,
    setQuestionSortOrder,
    toggleQuestionSortOrder,
    softDeleteDocument,
    loadDeletedDocuments,
    restoreDocument,
    permanentlyDeleteDocument,
    // 问题回收站
    deletedQuestions,
    deletedQuestionCount,
    softDeleteQuestion,
    loadDeletedQuestions,
    restoreQuestion,
    permanentlyDeleteQuestion,
    clearDeletedQuestions,
  };
});

// 排序辅助函数
interface SortableDocument {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SortableQuestion {
  id: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  order: number;
}

function sortDocuments<T extends SortableDocument>(
  docs: readonly T[],
  field: SortField,
  order: SortOrder,
): T[] {
  return [...docs].sort((a, b) => {
    let result = 0;
    switch (field) {
      case "createdAt":
        result = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case "updatedAt":
        result = a.updatedAt.getTime() - b.updatedAt.getTime();
        break;
      case "title":
        result = a.title.localeCompare(b.title, "zh-CN");
        break;
    }
    return order === "asc" ? result : -result;
  });
}

function sortQuestions<T extends SortableQuestion>(
  questions: readonly T[],
  field: QuestionSortField,
  order: SortOrder,
): T[] {
  return [...questions].sort((a, b) => {
    let result = 0;
    switch (field) {
      case "createdAt":
        result = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case "updatedAt":
        result = a.updatedAt.getTime() - b.updatedAt.getTime();
        break;
      case "title":
        result = a.text.localeCompare(b.text, "zh-CN");
        break;
      case "sortOrder":
        result = a.order - b.order;
        break;
    }
    return order === "asc" ? result : -result;
  });
}
