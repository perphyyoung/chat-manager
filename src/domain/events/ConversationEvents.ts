import { DomainEvent } from "./DomainEvent";

export class MessageSentEvent extends DomainEvent {
  readonly type = "MessageSent";
  constructor(
    public readonly documentId: string,
    public readonly messageId: string,
    public readonly messageType: "question" | "answer",
  ) {
    super();
  }
}

export class MessageEditedEvent extends DomainEvent {
  readonly type = "MessageEdited";
  constructor(
    public readonly documentId: string,
    public readonly messageId: string,
  ) {
    super();
  }
}

export class MessageDeletedEvent extends DomainEvent {
  readonly type = "MessageDeleted";
  constructor(
    public readonly documentId: string,
    public readonly messageId: string,
  ) {
    super();
  }
}
