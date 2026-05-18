export interface QuestionDTO {
  id: string;
  text: string;
  order: number;
}

export interface MessageDTO {
  id: string;
  type: "question" | "answer";
  content: string;
  questionId?: string;
  createdAt?: string;
  editedAt?: string;
}

export interface ConversationDTO {
  id: string;
  messages: MessageDTO[];
}

export interface DocumentDTO {
  id: string;
  title: string;
  questions: QuestionDTO[];
  conversation: ConversationDTO;
}
