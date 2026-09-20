/**
 * DTO 类型定义
 * 位于 src/types 目录，可被所有层共享，不违反分层依赖规则
 */

// 输入类型（用于创建/更新操作，字段可选）
export interface DocumentInput {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  questions?: QuestionInput[];
  answers?: AnswerInput[];
  tags?: TagInput[];
}

export interface QuestionInput {
  id: string;
  text: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface AnswerInput {
  id: string;
  questionId: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagInput {
  id: string;
  name: string;
  createdAt?: string;
}

// DTO 类型（用于数据传输，字段完整）
export interface DocumentDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  questions: QuestionDTO[];
  answers: AnswerDTO[];
  tags?: TagDTO[];
}

export interface QuestionDTO {
  id: string;
  text: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: number;
  deletedAt?: string;
}

export interface AnswerDTO {
  id: string;
  questionId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagDTO {
  id: string;
  name: string;
  createdAt: string;
}

// 文档列表摘要 DTO（性能优化：列表加载不携带 answers/questions 长文本）
export interface DocumentListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  tags: TagDTO[];
}
