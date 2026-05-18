import { ValidationError } from "../errors";

export class Question {
  constructor(
    public readonly id: string,
    private _text: string,
    private _order: number,
  ) {
    this.validateText(_text);
    this.validateOrder(_order);
  }

  get text(): string {
    return this._text;
  }

  get order(): number {
    return this._order;
  }

  updateText(newText: string): void {
    this.validateText(newText);
    this._text = newText;
  }

  changeOrder(newOrder: number): void {
    this.validateOrder(newOrder);
    this._order = newOrder;
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
    };
  }
}
