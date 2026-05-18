import { describe, it, expect } from 'vitest'
import { Message } from './Message'
import { ValidationError } from '../errors'

describe('Message', () => {
  it('should create a message with valid parameters', () => {
    const message = new Message('m1', 'question', 'How to start?', 'q1')

    expect(message.id).toBe('m1')
    expect(message.type).toBe('question')
    expect(message.content).toBe('How to start?')
    expect(message.questionId).toBe('q1')
  })

  it('should create a message without questionId', () => {
    const message = new Message('m1', 'answer', 'Just do it')

    expect(message.questionId).toBeUndefined()
  })

  it('should throw error when creating with invalid type', () => {
    expect(() => new Message('m1', 'invalid' as 'question', 'content')).toThrow(ValidationError)
  })

  it('should throw error when creating with empty content', () => {
    expect(() => new Message('m1', 'question', '')).toThrow(ValidationError)
    expect(() => new Message('m1', 'question', '   ')).toThrow(ValidationError)
  })

  it('should edit content and track edit time', () => {
    const beforeEdit = new Date()
    const message = new Message('m1', 'question', 'Original content')

    message.editContent('Updated content')

    expect(message.content).toBe('Updated content')
    expect(message.isEdited).toBe(true)
    expect(message.editedAt).toBeDefined()
    expect(message.editedAt!.getTime()).toBeGreaterThanOrEqual(beforeEdit.getTime())
  })

  it('should throw error when editing with empty content', () => {
    const message = new Message('m1', 'question', 'Valid content')

    expect(() => message.editContent('')).toThrow(ValidationError)
  })

  it('should serialize to JSON correctly', () => {
    const createdAt = new Date('2024-01-01')
    const message = new Message('m1', 'question', 'Test content', 'q1', createdAt)

    const json = message.toJSON()

    expect(json).toEqual({
      id: 'm1',
      type: 'question',
      content: 'Test content',
      questionId: 'q1',
      createdAt: createdAt.toISOString(),
      editedAt: undefined,
    })
  })

  it('should include editedAt in JSON when edited', () => {
    const message = new Message('m1', 'question', 'Original')
    message.editContent('Updated')

    const json = message.toJSON()

    expect(json.editedAt).toBeDefined()
  })
})
