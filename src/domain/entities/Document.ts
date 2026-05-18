import { Question } from "./Question";
import { Conversation } from "./Conversation";
import { ValidationError, NotFoundError } from "../errors";

export interface DocumentSummary {
  id: string;
  title: string;
  questionCount: number;
  messageCount: number;
}

export class Document {
  constructor(
    public readonly id: string,
    private _title: string,
    private _questions: Question[] = [],
    private _conversation: Conversation,
  ) {
    this.validateTitle(_title);
  }

  get title(): string {
    return this._title;
  }

  get questions(): readonly Question[] {
    return this._questions;
  }

  get conversation(): Conversation {
    return this._conversation;
  }

  get questionCount(): number {
    return this._questions.length;
  }

  updateTitle(newTitle: string): void {
    this.validateTitle(newTitle);
    this._title = newTitle;
  }

  addQuestion(text: string, order?: number): Question {
    const id = `q${Date.now()}`;
    const newOrder = order ?? this._questions.length;
    const question = new Question(id, text, newOrder);
    this._questions.push(question);
    return question;
  }

  removeQuestion(questionId: string): void {
    const index = this._questions.findIndex((q) => q.id === questionId);
    if (index === -1) {
      throw new NotFoundError("Question", questionId);
    }
    this._questions.splice(index, 1);
    this.reorderQuestionsAfterRemoval();
  }

  getQuestionById(questionId: string): Question | undefined {
    return this._questions.find((q) => q.id === questionId);
  }

  hasQuestion(questionId: string): boolean {
    return this._questions.some((q) => q.id === questionId);
  }

  reorderQuestions(orderedIds: string[]): void {
    if (orderedIds.length !== this._questions.length) {
      throw new ValidationError(
        "Ordered IDs must match the number of questions",
      );
    }

    const newOrder: Question[] = [];
    for (const id of orderedIds) {
      const question = this.getQuestionById(id);
      if (!question) {
        throw new NotFoundError("Question", id);
      }
      newOrder.push(question);
    }

    this._questions = newOrder;
    this._questions.forEach((q, index) => q.changeOrder(index));
  }

  getSummary(): DocumentSummary {
    return {
      id: this.id,
      title: this._title,
      questionCount: this._questions.length,
      messageCount: this._conversation.messageCount,
    };
  }

  toJSON() {
    return {
      id: this.id,
      title: this._title,
      questions: this._questions.map((q) => q.toJSON()),
      conversation: this._conversation.toJSON(),
    };
  }

  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new ValidationError("Document title cannot be empty");
    }
  }

  private reorderQuestionsAfterRemoval(): void {
    this._questions.forEach((q, index) => q.changeOrder(index));
  }
}
