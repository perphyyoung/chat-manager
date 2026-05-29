/**
 * 数据库行类型定义
 * 对应 SQLite 表结构，使用 snake_case 字段名
 */

// 文档表行
export interface DocRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted?: number;
  deleted_at?: string;
}

// 问题表行
export interface QuestionRow {
  id: string;
  document_id: string;
  text: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_deleted?: number;
  deleted_at?: string;
}

// 回答表行
export interface AnswerRow {
  id: string;
  question_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// 标签表行
export interface TagRow {
  id: string;
  name: string;
  created_at: string;
}

// EXISTS 查询结果
export interface ExistsRow {
  "1": number;
}
