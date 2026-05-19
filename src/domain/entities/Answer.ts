import { ValidationError } from "../errors";

export class Answer {
  private _updatedAt: Date;

  constructor(
    public readonly id: string,
    public readonly questionId: string,
    private _content: string,
    private readonly _createdAt: Date = new Date(),
  ) {
    this._updatedAt = _createdAt;
    this.validateContent(_content);
  }

  get content(): string {
    return this._content;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  editContent(newContent: string): void {
    this.validateContent(newContent);
    this._content = newContent;
    this._updatedAt = new Date();
  }

  private validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new ValidationError("Answer content cannot be empty");
    }
  }

  toJSON() {
    return {
      id: this.id,
      questionId: this.questionId,
      content: this._content,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
