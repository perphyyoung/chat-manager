import type { DomainEvent } from "./DomainEvent";

export interface EventBus {
  emit(event: DomainEvent): void;
  on<T extends DomainEvent>(type: string, handler: (event: T) => void): void;
  off<T extends DomainEvent>(type: string, handler: (event: T) => void): void;
  once<T extends DomainEvent>(type: string, handler: (event: T) => void): void;
}

export class SimpleEventBus implements EventBus {
  private handlers: Map<string, Set<(event: DomainEvent) => void>> = new Map();
  private onceHandlers: Map<string, Set<(event: DomainEvent) => void>> =
    new Map();

  emit(event: DomainEvent): void {
    const type = event.type;

    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }

    const onceHandlers = this.onceHandlers.get(type);
    if (onceHandlers) {
      onceHandlers.forEach((handler) => handler(event));
      this.onceHandlers.delete(type);
    }
  }

  on<T extends DomainEvent>(type: string, handler: (event: T) => void): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as (event: DomainEvent) => void);
  }

  off<T extends DomainEvent>(type: string, handler: (event: T) => void): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as (event: DomainEvent) => void);
    }

    const onceHandlers = this.onceHandlers.get(type);
    if (onceHandlers) {
      onceHandlers.delete(handler as (event: DomainEvent) => void);
    }
  }

  once<T extends DomainEvent>(type: string, handler: (event: T) => void): void {
    if (!this.onceHandlers.has(type)) {
      this.onceHandlers.set(type, new Set());
    }
    this.onceHandlers.get(type)!.add(handler as (event: DomainEvent) => void);
  }

  clear(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
  }
}

export const globalEventBus = new SimpleEventBus();
