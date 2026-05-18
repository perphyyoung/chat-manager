import { describe, it, expect } from 'vitest'
import { Document } from './Document'
import { Question } from './Question'
import { Conversation } from './Conversation'
import { Message } from './Message'
import { ValidationError, NotFoundError } from '../errors'

describe('Document', () => {
  const createConversation = () => new Conversation('conv1')

  it('should create a document with valid parameters', () => {
    const conversation = createConversation()
    const document = new Document('doc1', 'Test Document', [], conversation)

    expect(document.id).toBe('doc1')
    expect(document.title).toBe('Test Document')
    expect(document.questions).toEqual([])
    expect(document.conversation).toBe(conversation)
  })

  it('should throw error when creating with empty title', () => {
    const conversation = createConversation()
    expect(() => new Document('doc1', '', [], conversation)).toThrow(ValidationError)
    expect(() => new Document('doc1', '   ', [], conversation)).toThrow(ValidationError)
  })

  it('should update title with valid value', () => {
    const conversation = createConversation()
    const document = new Document('doc1', 'Original Title', [], conversation)

    document.updateTitle('Updated Title')

    expect(document.title).toBe('Updated Title')
  })

  it('should throw error when updating with empty title', () => {
    const conversation = createConversation()
    const document = new Document('doc1', 'Valid Title', [], conversation)

    expect(() => document.updateTitle('')).toThrow(ValidationError)
  })

  it('should add a question', () => {
    const conversation = createConversation()
    const document = new Document('doc1', 'Test', [], conversation)

    const question = document.addQuestion('New Question?')

    expect(document.questionCount).toBe(1)
    expect(question.text).toBe('New Question?')
    expect(document.hasQuestion(question.id)).toBe(true)
  })

  it('should add a question with specific order', () => {
    const conversation = createConversation()
    const document = new Document('doc1', 'Test', [], conversation)

    const question = document.addQuestion('Question?', 5)

    expect(question.order).toBe(5)
  })

  it('should remove a question', () => {
    const conversation = createConversation()
    const question = new Question('q1', 'To be removed', 0)
    const document = new Document('doc1', 'Test', [question], conversation)

    document.removeQuestion('q1')

    expect(document.questionCount).toBe(0)
    expect(document.hasQuestion('q1')).toBe(false)
  })

  it('should throw error when removing non-existent question', () => {
    const conversation = createConversation()
    const document = new Document('doc1', 'Test', [], conversation)

    expect(() => document.removeQuestion('non-existent')).toThrow(NotFoundError)
  })

  it('should reorder questions after removal', () => {
    const conversation = createConversation()
    const q1 = new Question('q1', 'Q1', 0)
    const q2 = new Question('q2', 'Q2', 1)
    const q3 = new Question('q3', 'Q3', 2)
    const document = new Document('doc1', 'Test', [q1, q2, q3], conversation)

    document.removeQuestion('q2')

    expect(q1.order).toBe(0)
    expect(q3.order).toBe(1)
  })

  it('should get question by id', () => {
    const conversation = createConversation()
    const question = new Question('q1', 'Find me', 0)
    const document = new Document('doc1', 'Test', [question], conversation)

    const found = document.getQuestionById('q1')

    expect(found).toBe(question)
  })

  it('should return undefined for non-existent question id', () => {
    const conversation = createConversation()
    const document = new Document('doc1', 'Test', [], conversation)

    const found = document.getQuestionById('non-existent')

    expect(found).toBeUndefined()
  })

  it('should check if has question', () => {
    const conversation = createConversation()
    const question = new Question('q1', 'Test', 0)
    const document = new Document('doc1', 'Test', [question], conversation)

    expect(document.hasQuestion('q1')).toBe(true)
    expect(document.hasQuestion('non-existent')).toBe(false)
  })

  it('should reorder questions', () => {
    const conversation = createConversation()
    const q1 = new Question('q1', 'Q1', 0)
    const q2 = new Question('q2', 'Q2', 1)
    const q3 = new Question('q3', 'Q3', 2)
    const document = new Document('doc1', 'Test', [q1, q2, q3], conversation)

    document.reorderQuestions(['q3', 'q1', 'q2'])

    expect(document.questions[0]).toBe(q3)
    expect(document.questions[1]).toBe(q1)
    expect(document.questions[2]).toBe(q2)
    expect(q3.order).toBe(0)
    expect(q1.order).toBe(1)
    expect(q2.order).toBe(2)
  })

  it('should throw error when reordering with wrong count', () => {
    const conversation = createConversation()
    const q1 = new Question('q1', 'Q1', 0)
    const document = new Document('doc1', 'Test', [q1], conversation)

    expect(() => document.reorderQuestions(['q1', 'q2'])).toThrow(ValidationError)
  })

  it('should throw error when reordering with non-existent id', () => {
    const conversation = createConversation()
    const q1 = new Question('q1', 'Q1', 0)
    const document = new Document('doc1', 'Test', [q1], conversation)

    expect(() => document.reorderQuestions(['non-existent'])).toThrow(NotFoundError)
  })

  it('should get summary', () => {
    const conversation = new Conversation('conv1', [
      new Message('m1', 'question', 'Q1'),
      new Message('m2', 'answer', 'A1'),
    ])
    const question = new Question('q1', 'Q1', 0)
    const document = new Document('doc1', 'Test Doc', [question], conversation)

    const summary = document.getSummary()

    expect(summary).toEqual({
      id: 'doc1',
      title: 'Test Doc',
      questionCount: 1,
      messageCount: 2,
    })
  })

  it('should serialize to JSON correctly', () => {
    const conversation = new Conversation('conv1')
    const question = new Question('q1', 'Test Q', 0)
    const document = new Document('doc1', 'Test Doc', [question], conversation)

    const json = document.toJSON()

    expect(json.id).toBe('doc1')
    expect(json.title).toBe('Test Doc')
    expect(json.questions).toHaveLength(1)
    expect(json.conversation.id).toBe('conv1')
  })
})
