import { ValidationError } from "../errors";

export class Question {
  private _updatedAt: Date;
  private _isDeleted: boolean = false;
  private _deletedAt?: Date;

  constructor(
    public readonly id: string,
    private _text: string,
    private _order: number,
    private readonly _createdAt: Date = new Date(),
    isDeleted: boolean = false,
    deletedAt?: Date,
    updatedAt?: Date,
  ) {
    this._updatedAt = updatedAt ?? _createdAt;
    this._isDeleted = isDeleted;
    this._deletedAt = deletedAt;
    this.validateText(_text);
    this.validateOrder(_order);
  }

  get text(): string {
    return this._text;
  }

  get order(): number {
    return this._order;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get isDeleted(): boolean {
    return this._isDeleted;
  }

  get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  updateText(newText: string): void {
    this.validateText(newText);
    this._text = newText;
    this._updatedAt = new Date();
  }

  changeOrder(newOrder: number): void {
    this.validateOrder(newOrder);
    this._order = newOrder;
    this._updatedAt = new Date();
  }

  softDelete(): void {
    this._isDeleted = true;
    this._deletedAt = new Date();
    this._updatedAt = new Date();
  }

  restore(): void {
    this._isDeleted = false;
    this._deletedAt = undefined;
    this._updatedAt = new Date();
  }

  /** 标记活跃时间（如回答新增/编辑/删除），不修改内容与顺序 */
  touch(): void {
    this._updatedAt = new Date();
  }

  private validateText(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new ValidationError("Question text cannot be empty");
    }
  }

  private validateOrder(order: number): void {
    if (order < 0) {
      throw new ValidationError("Question order cannot be negative");
    }
  }

  toJSON() {
    return {
      id: this.id,
      text: this._text,
      order: this._order,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      isDeleted: this._isDeleted,
      deletedAt: this._deletedAt?.toISOString(),
    };
  }
}
