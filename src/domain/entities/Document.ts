import { Question } from "./Question";
import { Answer } from "./Answer";
import { Tag } from "./Tag";
import { ValidationError, NotFoundError } from "../errors";

export interface DocumentSummary {
  id: string;
  title: string;
  questionCount: number;
  answerCount: number;
}

export class Document {
  constructor(
    public readonly id: string,
    private _title: string,
    private _questions: Question[] = [],
    private _answers: Answer[] = [],
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = _createdAt,
    private _tags: Tag[] = [],
  ) {
    this.validateTitle(_title);
  }

  get title(): string {
    return this._title;
  }

  get questions(): readonly Question[] {
    return this._questions;
  }

  get answers(): readonly Answer[] {
    return this._answers;
  }

  get questionCount(): number {
    return this._questions.length;
  }

  get answerCount(): number {
    return this._answers.length;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get tags(): readonly Tag[] {
    return this._tags;
  }

  addTag(tag: Tag): void {
    if (this.hasTag(tag.id)) {
      return;
    }
    this._tags.push(tag);
    this._updatedAt = new Date();
  }

  removeTag(tagId: string): void {
    const index = this._tags.findIndex((t) => t.id === tagId);
    if (index === -1) {
      throw new NotFoundError("Tag", tagId);
    }
    this._tags.splice(index, 1);
    this._updatedAt = new Date();
  }

  hasTag(tagId: string): boolean {
    return this._tags.some((t) => t.id === tagId);
  }

  updateTagName(tagId: string, newName: string): void {
    const tag = this._tags.find((t) => t.id === tagId);
    if (tag) {
      tag.updateName(newName);
      this._updatedAt = new Date();
    }
  }

  updateTitle(newTitle: string): void {
    this.validateTitle(newTitle);
    this._title = newTitle;
    this._updatedAt = new Date();
  }

  addQuestion(text: string, order?: number): Question {
    const id = `q${Date.now()}`;
    const newOrder = order ?? this._questions.length;
    const question = new Question(id, text, newOrder);
    this._questions.push(question);
    this._updatedAt = new Date();
    return question;
  }

  removeQuestion(questionId: string): void {
    const index = this._questions.findIndex((q) => q.id === questionId);
    if (index === -1) {
      throw new NotFoundError("Question", questionId);
    }
    this._questions.splice(index, 1);
    this.reorderQuestionsAfterRemoval();
    this._updatedAt = new Date();
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
    this._updatedAt = new Date();
  }

  addAnswer(answer: Answer): void {
    this._answers.push(answer);
    this._updatedAt = new Date();
  }

  removeAnswer(answerId: string): void {
    const index = this._answers.findIndex((a) => a.id === answerId);
    if (index === -1) {
      throw new NotFoundError("Answer", answerId);
    }
    this._answers.splice(index, 1);
    this._updatedAt = new Date();
  }

  getAnswerByQuestionId(questionId: string): Answer | undefined {
    return this._answers.find((a) => a.questionId === questionId);
  }

  getQuestionAnswerPair(
    questionId: string,
  ): { question: Question; answer?: Answer } | undefined {
    const question = this.getQuestionById(questionId);
    if (!question) return undefined;
    const answer = this.getAnswerByQuestionId(questionId);
    return { question, answer };
  }

  getSummary(): DocumentSummary {
    return {
      id: this.id,
      title: this._title,
      questionCount: this._questions.length,
      answerCount: this._answers.length,
    };
  }

  toJSON() {
    return {
      id: this.id,
      title: this._title,
      questions: this._questions.map((q) => q.toJSON()),
      answers: this._answers.map((a) => a.toJSON()),
      tags: this._tags.map((t) => t.toJSON()),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
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
