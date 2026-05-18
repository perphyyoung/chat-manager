import { describe, it, expect } from 'vitest'
import { Question } from './Question'
import { ValidationError } from '../errors'

describe('Question', () => {
  it('should create a question with valid parameters', () => {
    const question = new Question('q1', 'How to create a project?', 1)

    expect(question.id).toBe('q1')
    expect(question.text).toBe('How to create a project?')
    expect(question.order).toBe(1)
  })

  it('should throw error when creating with empty text', () => {
    expect(() => new Question('q1', '', 1)).toThrow(ValidationError)
    expect(() => new Question('q1', '   ', 1)).toThrow(ValidationError)
  })

  it('should throw error when creating with negative order', () => {
    expect(() => new Question('q1', 'Valid text', -1)).toThrow(ValidationError)
  })

  it('should update text with valid value', () => {
    const question = new Question('q1', 'Original text', 1)

    question.updateText('Updated text')

    expect(question.text).toBe('Updated text')
  })

  it('should throw error when updating with empty text', () => {
    const question = new Question('q1', 'Valid text', 1)

    expect(() => question.updateText('')).toThrow(ValidationError)
  })

  it('should change order with valid value', () => {
    const question = new Question('q1', 'Valid text', 1)

    question.changeOrder(5)

    expect(question.order).toBe(5)
  })

  it('should throw error when changing to negative order', () => {
    const question = new Question('q1', 'Valid text', 1)

    expect(() => question.changeOrder(-1)).toThrow(ValidationError)
  })

  it('should serialize to JSON correctly', () => {
    const question = new Question('q1', 'Test question', 2)

    const json = question.toJSON()

    expect(json).toEqual({
      id: 'q1',
      text: 'Test question',
      order: 2,
    })
  })
})
