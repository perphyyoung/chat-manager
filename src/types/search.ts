/**
 * 搜索结果类型定义
 * 位于 src/types 目录，可被所有层共享
 */

export interface SearchResults {
  documents: DocumentSearchResult[];
  questions: QuestionSearchResult[];
  answers: AnswerSearchResult[];
  tags: TagSearchResult[];
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  questionCount: number;
  answerCount: number;
}

export interface QuestionSearchResult {
  id: string;
  text: string;
  snippet?: string;
  documentId: string;
  documentTitle: string;
}

export interface AnswerSearchResult {
  id: string;
  content: string;
  snippet?: string;
  questionText: string;
  questionId: string;
  documentId: string;
  documentTitle: string;
}

export interface TagSearchResult {
  id: string;
  name: string;
  documentCount: number;
}
