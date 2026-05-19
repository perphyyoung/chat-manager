import { ValidationError } from "../errors";

export class Question {
  private _updatedAt: Date;

  constructor(
    public readonly id: string,
    private _text: string,
    private _order: number,
    private readonly _createdAt: Date = new Date(),
  ) {
    this._updatedAt = _createdAt;
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
    };
  }
}
