import { describe, it, expect } from 'vitest'
import { Question } from './Question'
import { ValidationError } from '../errors'

describe('Question', () => {
  const mockDate = new Date('2025-01-01T00:00:00.000Z')

  it('should create a question with valid parameters', () => {
    const question = new Question('q1', 'How to create a project?', 1, mockDate)

    expect(question.id).toBe('q1')
    expect(question.text).toBe('How to create a project?')
    expect(question.order).toBe(1)
    expect(question.createdAt).toBe(mockDate)
    expect(question.updatedAt).toBe(mockDate)
  })

  it('should throw error when creating with empty text', () => {
    expect(() => new Question('q1', '', 1, mockDate)).toThrow(ValidationError)
    expect(() => new Question('q1', '   ', 1, mockDate)).toThrow(ValidationError)
  })

  it('should throw error when creating with negative order', () => {
    expect(() => new Question('q1', 'Valid text', -1, mockDate)).toThrow(ValidationError)
  })

  it('should update text with valid value', () => {
    const question = new Question('q1', 'Original text', 1, mockDate)

    question.updateText('Updated text')

    expect(question.text).toBe('Updated text')
  })

  it('should throw error when updating with empty text', () => {
    const question = new Question('q1', 'Valid text', 1, mockDate)

    expect(() => question.updateText('')).toThrow(ValidationError)
  })

  it('should change order with valid value', () => {
    const question = new Question('q1', 'Valid text', 1, mockDate)

    question.changeOrder(5)

    expect(question.order).toBe(5)
  })

  it('should throw error when changing to negative order', () => {
    const question = new Question('q1', 'Valid text', 1, mockDate)

    expect(() => question.changeOrder(-1)).toThrow(ValidationError)
  })

  it('should serialize to JSON correctly', () => {
    const question = new Question('q1', 'Test question', 2, mockDate)

    const json = question.toJSON()

    expect(json).toEqual({
      id: 'q1',
      text: 'Test question',
      order: 2,
      createdAt: mockDate.toISOString(),
      updatedAt: mockDate.toISOString(),
    })
  })
})
