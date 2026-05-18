export abstract class DomainEvent {
  readonly occurredAt: Date;
  abstract readonly type: string;

  constructor() {
    this.occurredAt = new Date();
  }
}

export type DomainEventClass<T extends DomainEvent> = new (
  ...args: unknown[]
) => T;
