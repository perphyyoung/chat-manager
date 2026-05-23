import { ValidationError } from "../errors";

export class Tag {
  constructor(
    public readonly id: string,
    private _name: string,
    private readonly _createdAt: Date = new Date(),
  ) {
    this.validateName(_name);
  }

  get name(): string {
    return this._name;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  updateName(newName: string): void {
    this.validateName(newName);
    this._name = newName;
  }

  toJSON() {
    return {
      id: this.id,
      name: this._name,
      createdAt: this._createdAt.toISOString(),
    };
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError("Tag name cannot be empty");
    }
  }
}
