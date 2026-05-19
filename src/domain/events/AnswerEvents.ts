import { DomainEvent } from "./DomainEvent";

export class AnswerCreatedEvent extends DomainEvent {
  readonly type = "AnswerCreatedEvent";

  constructor(
    public readonly documentId: string,
    public readonly questionId: string,
    public readonly answerId: string,
  ) {
    super();
  }
}

export class AnswerUpdatedEvent extends DomainEvent {
  readonly type = "AnswerUpdatedEvent";

  constructor(
    public readonly documentId: string,
    public readonly answerId: string,
  ) {
    super();
  }
}

export class AnswerDeletedEvent extends DomainEvent {
  readonly type = "AnswerDeletedEvent";

  constructor(
    public readonly documentId: string,
    public readonly answerId: string,
  ) {
    super();
  }
}
