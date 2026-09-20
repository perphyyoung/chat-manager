import { Question } from "@/domain/entities";
import type { QuestionDTO } from "@/types/dto";

// 从 DTO 重建 Question 的共享映射：两个仓库（Document/Question）字段映射完全一致，
// 抽为单一函数避免重复维护（此前两处独立实现导致 updatedAt 漏读的 bug）
export function questionFromDTO(dto: QuestionDTO): Question {
  return new Question(
    dto.id,
    dto.text,
    dto.order,
    new Date(dto.createdAt),
    dto.isDeleted === 1,
    dto.deletedAt ? new Date(dto.deletedAt) : undefined,
    dto.updatedAt ? new Date(dto.updatedAt) : undefined,
  );
}
