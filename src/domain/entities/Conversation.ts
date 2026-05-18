import { Message } from "./Message";
import { NotFoundError } from "../errors";

export class Conversation {
  constructor(
    public readonly id: string,
    private _messages: Message[] = [],
  ) {}

  get messages(): readonly Message[] {
    return this._messages;
  }

  get messageCount(): number {
    return this._messages.length;
  }

  addMessage(message: Message): void {
    this._messages.push(message);
  }

  removeMessage(messageId: string): void {
    const index = this._messages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      throw new NotFoundError("Message", messageId);
    }
    this._messages.splice(index, 1);
  }

  getMessageById(messageId: string): Message | undefined {
    return this._messages.find((m) => m.id === messageId);
  }

  getMessagesByQuestionId(questionId: string): Message[] {
    return this._messages.filter((m) => m.questionId === questionId);
  }

  getQuestionAnswerPair(questionId: string): {
    question?: Message;
    answer?: Message;
  } {
    const messages = this.getMessagesByQuestionId(questionId);
    return {
      question: messages.find((m) => m.type === "question"),
      answer: messages.find((m) => m.type === "answer"),
    };
  }

  getLastMessage(): Message | undefined {
    return this._messages[this._messages.length - 1];
  }

  toJSON() {
    return {
      id: this.id,
      messages: this._messages.map((m) => m.toJSON()),
    };
  }
}
