import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SimpleEventBus } from './EventBus'
import { DomainEvent } from './DomainEvent'

class TestEvent extends DomainEvent {
  readonly type = 'TestEvent'
  constructor(public readonly data: string) {
    super()
  }
}

describe('SimpleEventBus', () => {
  let eventBus: SimpleEventBus

  beforeEach(() => {
    eventBus = new SimpleEventBus()
  })

  it('should emit and receive events', () => {
    const handler = vi.fn<(event: DomainEvent) => void>()
    eventBus.on('TestEvent', handler)

    const event = new TestEvent('test data')
    eventBus.emit(event)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('should not receive events after unsubscribing', () => {
    const handler = vi.fn<(event: DomainEvent) => void>()
    eventBus.on('TestEvent', handler)
    eventBus.off('TestEvent', handler)

    eventBus.emit(new TestEvent('test'))

    expect(handler).not.toHaveBeenCalled()
  })

  it('should handle once subscription', () => {
    const handler = vi.fn<(event: DomainEvent) => void>()
    eventBus.once('TestEvent', handler)

    eventBus.emit(new TestEvent('first'))
    eventBus.emit(new TestEvent('second'))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should not call handlers for different event types', () => {
    const testHandler = vi.fn<(event: DomainEvent) => void>()
    const anotherHandler = vi.fn<(event: DomainEvent) => void>()

    eventBus.on('TestEvent', testHandler)
    eventBus.on('AnotherEvent', anotherHandler)

    eventBus.emit(new TestEvent('test'))

    expect(testHandler).toHaveBeenCalledTimes(1)
    expect(anotherHandler).not.toHaveBeenCalled()
  })

  it('should clear all handlers', () => {
    const handler = vi.fn<(event: DomainEvent) => void>()
    eventBus.on('TestEvent', handler)
    eventBus.clear()

    eventBus.emit(new TestEvent('test'))

    expect(handler).not.toHaveBeenCalled()
  })
})
