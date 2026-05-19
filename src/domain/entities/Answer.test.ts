import { describe, it, expect } from 'vitest'
import { Answer } from './Answer'

describe('Answer', () => {
  const mockDate = new Date('2025-01-01T00:00:00.000Z')

  it('should create an answer with valid parameters', () => {
    const answer = new Answer('a1', 'q1', 'This is the answer content', mockDate)

    expect(answer.id).toBe('a1')
    expect(answer.questionId).toBe('q1')
    expect(answer.content).toBe('This is the answer content')
    expect(answer.createdAt).toBe(mockDate)
    expect(answer.updatedAt).toBe(mockDate)
  })

  it('should use current date when createdAt is not provided', () => {
    const before = new Date()
    const answer = new Answer('a1', 'q1', 'Content')
    const after = new Date()

    expect(answer.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(answer.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('should edit content and update updatedAt', () => {
    const answer = new Answer('a1', 'q1', 'Original content', mockDate)
    const beforeEdit = new Date()

    answer.editContent('Updated content')
    const afterEdit = new Date()

    expect(answer.content).toBe('Updated content')
    expect(answer.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeEdit.getTime())
    expect(answer.updatedAt.getTime()).toBeLessThanOrEqual(afterEdit.getTime())
  })

  it('should serialize to JSON correctly', () => {
    const answer = new Answer('a1', 'q1', 'Test content', mockDate)

    const json = answer.toJSON()

    expect(json).toEqual({
      id: 'a1',
      questionId: 'q1',
      content: 'Test content',
      createdAt: mockDate.toISOString(),
      updatedAt: mockDate.toISOString(),
    })
  })

  it('should handle multi-line content', () => {
    const multiLineContent = 'Line 1\nLine 2\nLine 3'
    const answer = new Answer('a1', 'q1', multiLineContent, mockDate)

    expect(answer.content).toBe(multiLineContent)
  })
})
