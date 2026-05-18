import { DomainEvent } from "./DomainEvent";

export class QuestionActivatedEvent extends DomainEvent {
  readonly type = "QuestionActivated";
  constructor(
    public readonly documentId: string,
    public readonly questionId: string,
  ) {
    super();
  }
}

export class QuestionAddedEvent extends DomainEvent {
  readonly type = "QuestionAdded";
  constructor(
    public readonly documentId: string,
    public readonly question: { id: string; text: string; order: number },
  ) {
    super();
  }
}

export class QuestionRemovedEvent extends DomainEvent {
  readonly type = "QuestionRemoved";
  constructor(
    public readonly documentId: string,
    public readonly questionId: string,
  ) {
    super();
  }
}

export class QuestionsReorderedEvent extends DomainEvent {
  readonly type = "QuestionsReordered";
  constructor(
    public readonly documentId: string,
    public readonly newOrder: string[],
  ) {
    super();
  }
}
