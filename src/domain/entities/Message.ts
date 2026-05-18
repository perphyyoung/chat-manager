import { ValidationError } from "../errors";

export type MessageType = "question" | "answer";

export class Message {
  private _editedAt?: Date;

  constructor(
    public readonly id: string,
    private _type: MessageType,
    private _content: string,
    private _questionId?: string,
    private readonly _createdAt: Date = new Date(),
  ) {
    this.validateType(_type);
    this.validateContent(_content);
  }

  get type(): MessageType {
    return this._type;
  }

  get content(): string {
    return this._content;
  }

  get questionId(): string | undefined {
    return this._questionId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get editedAt(): Date | undefined {
    return this._editedAt;
  }

  get isEdited(): boolean {
    return this._editedAt !== undefined;
  }

  editContent(newContent: string): void {
    this.validateContent(newContent);
    this._content = newContent;
    this._editedAt = new Date();
  }

  private validateType(type: string): void {
    if (type !== "question" && type !== "answer") {
      throw new ValidationError('Message type must be "question" or "answer"');
    }
  }

  private validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new ValidationError("Message content cannot be empty");
    }
  }

  toJSON() {
    return {
      id: this.id,
      type: this._type,
      content: this._content,
      questionId: this._questionId,
      createdAt: this._createdAt.toISOString(),
      editedAt: this._editedAt?.toISOString(),
    };
  }
}
