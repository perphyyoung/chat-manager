import { DomainEvent } from "./DomainEvent";

export class DocumentSelectedEvent extends DomainEvent {
  readonly type = "DocumentSelected";
  constructor(public readonly documentId: string) {
    super();
  }
}

export class DocumentsLoadedEvent extends DomainEvent {
  readonly type = "DocumentsLoaded";
  constructor(public readonly documents: { id: string; title: string }[]) {
    super();
  }
}

export class DocumentCreatedEvent extends DomainEvent {
  readonly type = "DocumentCreated";
  constructor(
    public readonly documentId: string,
    public readonly title: string,
  ) {
    super();
  }
}

export class DocumentUpdatedEvent extends DomainEvent {
  readonly type = "DocumentUpdated";
  constructor(
    public readonly documentId: string,
    public readonly changes: Partial<{ title: string }>,
  ) {
    super();
  }
}

export class DocumentDeletedEvent extends DomainEvent {
  readonly type = "DocumentDeleted";
  constructor(public readonly documentId: string) {
    super();
  }
}
