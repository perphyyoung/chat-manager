/**
 * 统一 ID 生成工具
 * 格式: {prefix}{timestamp}_{random}
 * 确保高并发下 ID 唯一性
 */

export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}${timestamp}_${random}`;
}

// 预定义的 ID 生成器
export const generateDocumentId = () => generateId("doc");
export const generateQuestionId = () => generateId("q");
export const generateAnswerId = () => generateId("a");
export const generateTagId = () => generateId("tag");
