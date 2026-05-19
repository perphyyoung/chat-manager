import { describe, it, expect } from 'vitest'
import { Document, Question, Answer } from './index'
import { ValidationError, NotFoundError } from '../errors'

describe('Document', () => {
  const mockDate = new Date('2025-01-01T00:00:00.000Z')

  describe('constructor', () => {
    it('should create a document with valid title', () => {
      const doc = new Document('doc1', 'Test Document', [], [], mockDate)

      expect(doc.id).toBe('doc1')
      expect(doc.title).toBe('Test Document')
      expect(doc.questions).toHaveLength(0)
      expect(doc.answers).toHaveLength(0)
      expect(doc.createdAt).toBe(mockDate)
      expect(doc.updatedAt).toBe(mockDate)
    })

    it('should create document with questions and answers', () => {
      const questions = [new Question('q1', 'Question 1', 0, mockDate)]
      const answers = [new Answer('a1', 'q1', 'Answer 1', mockDate)]
      const doc = new Document('doc1', 'Test', questions, answers, mockDate)

      expect(doc.questions).toHaveLength(1)
      expect(doc.answers).toHaveLength(1)
    })

    it('should throw error with empty title', () => {
      expect(() => new Document('doc1', '', [], [], mockDate)).toThrow(ValidationError)
    })

    it('should throw error with whitespace title', () => {
      expect(() => new Document('doc1', '   ', [], [], mockDate)).toThrow(ValidationError)
    })
  })

  describe('updateTitle', () => {
    it('should update title successfully', () => {
      const doc = new Document('doc1', 'Original Title', [], [], mockDate)
      const originalUpdatedAt = doc.updatedAt

      doc.updateTitle('New Title')

      expect(doc.title).toBe('New Title')
      expect(doc.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime())
    })

    it('should throw error with empty title', () => {
      const doc = new Document('doc1', 'Original Title', [], [], mockDate)

      expect(() => doc.updateTitle('')).toThrow(ValidationError)
    })
  })

  describe('questions management', () => {
    it('should add question', () => {
      const doc = new Document('doc1', 'Test', [], [], mockDate)

      const question = doc.addQuestion('New question')

      expect(question.text).toBe('New question')
      expect(question.order).toBe(0)
      expect(doc.questions).toHaveLength(1)
    })

    it('should add multiple questions with sequential orders', () => {
      const doc = new Document('doc1', 'Test', [], [], mockDate)

      doc.addQuestion('Question 1')
      doc.addQuestion('Question 2')
      doc.addQuestion('Question 3')

      expect(doc.questions[0]!.order).toBe(0)
      expect(doc.questions[1]!.order).toBe(1)
      expect(doc.questions[2]!.order).toBe(2)
    })

    it('should remove question by id', () => {
      const q1 = new Question('q1', 'Q1', 0, mockDate)
      const q2 = new Question('q2', 'Q2', 1, mockDate)
      const doc = new Document('doc1', 'Test', [q1, q2], [], mockDate)

      doc.removeQuestion('q1')

      expect(doc.questions).toHaveLength(1)
      expect(doc.questions[0]!.id).toBe('q2')
    })

    it('should throw NotFoundError when removing non-existent question', () => {
      const doc = new Document('doc1', 'Test', [], [], mockDate)

      expect(() => doc.removeQuestion('q1')).toThrow(NotFoundError)
    })

    it('should reorder questions', () => {
      const q1 = new Question('q1', 'Q1', 0, mockDate)
      const q2 = new Question('q2', 'Q2', 1, mockDate)
      const q3 = new Question('q3', 'Q3', 2, mockDate)
      const doc = new Document('doc1', 'Test', [q1, q2, q3], [], mockDate)

      doc.reorderQuestions(['q3', 'q1', 'q2'])

      expect(doc.questions[0]!.id).toBe('q3')
      expect(doc.questions[1]!.id).toBe('q1')
      expect(doc.questions[2]!.id).toBe('q2')
      expect(doc.questions[0]!.order).toBe(0)
      expect(doc.questions[1]!.order).toBe(1)
      expect(doc.questions[2]!.order).toBe(2)
    })

    it('should throw error when reordering with wrong count', () => {
      const q1 = new Question('q1', 'Q1', 0, mockDate)
      const doc = new Document('doc1', 'Test', [q1], [], mockDate)

      expect(() => doc.reorderQuestions(['q1', 'q2'])).toThrow(ValidationError)
    })

    it('should throw error when reordering with non-existent id', () => {
      const q1 = new Question('q1', 'Q1', 0, mockDate)
      const doc = new Document('doc1', 'Test', [q1], [], mockDate)

      expect(() => doc.reorderQuestions(['q2'])).toThrow(NotFoundError)
    })

    it('should get question by id', () => {
      const q1 = new Question('q1', 'Q1', 0, mockDate)
      const doc = new Document('doc1', 'Test', [q1], [], mockDate)

      const found = doc.getQuestionById('q1')

      expect(found).toBe(q1)
    })

    it('should return undefined for non-existent question', () => {
      const doc = new Document('doc1', 'Test', [], [], mockDate)

      expect(doc.getQuestionById('q1')).toBeUndefined()
    })

    it('should check if has question', () => {
      const q1 = new Question('q1', 'Q1', 0, mockDate)
      const doc = new Document('doc1', 'Test', [q1], [], mockDate)

      expect(doc.hasQuestion('q1')).toBe(true)
      expect(doc.hasQuestion('q2')).toBe(false)
    })
  })

  describe('answers management', () => {
    it('should add answer', () => {
      const doc = new Document('doc1', 'Test', [], [], mockDate)
      const answer = new Answer('a1', 'q1', 'Answer content', mockDate)

      doc.addAnswer(answer)

      expect(doc.answers).toHaveLength(1)
      expect(doc.answers[0]).toBe(answer)
    })

    it('should remove answer by id', () => {
      const answer = new Answer('a1', 'q1', 'Content', mockDate)
      const doc = new Document('doc1', 'Test', [], [answer], mockDate)

      doc.removeAnswer('a1')

      expect(doc.answers).toHaveLength(0)
    })

    it('should throw NotFoundError when removing non-existent answer', () => {
      const doc = new Document('doc1', 'Test', [], [], mockDate)

      expect(() => doc.removeAnswer('a1')).toThrow(NotFoundError)
    })

    it('should get answer by question id', () => {
      const answer = new Answer('a1', 'q1', 'Content', mockDate)
      const doc = new Document('doc1', 'Test', [], [answer], mockDate)

      const found = doc.getAnswerByQuestionId('q1')

      expect(found).toBe(answer)
    })

    it('should return undefined when answer not found by question id', () => {
      const doc = new Document('doc1', 'Test', [], [], mockDate)

      expect(doc.getAnswerByQuestionId('q1')).toBeUndefined()
    })
  })

  describe('getQuestionAnswerPair', () => {
    it('should return question and answer pair', () => {
      const question = new Question('q1', 'Question', 0, mockDate)
      const answer = new Answer('a1', 'q1', 'Answer', mockDate)
      const doc = new Document('doc1', 'Test', [question], [answer], mockDate)

      const pair = doc.getQuestionAnswerPair('q1')

      expect(pair).toBeDefined()
      expect(pair!.question).toBe(question)
      expect(pair!.answer).toBe(answer)
    })

    it('should return question without answer', () => {
      const question = new Question('q1', 'Question', 0, mockDate)
      const doc = new Document('doc1', 'Test', [question], [], mockDate)

      const pair = doc.getQuestionAnswerPair('q1')

      expect(pair).toBeDefined()
      expect(pair!.question).toBe(question)
      expect(pair!.answer).toBeUndefined()
    })

    it('should return undefined when question not found', () => {
      const doc = new Document('doc1', 'Test', [], [], mockDate)

      expect(doc.getQuestionAnswerPair('q1')).toBeUndefined()
    })
  })

  describe('getSummary', () => {
    it('should return correct summary', () => {
      const questions = [
        new Question('q1', 'Q1', 0, mockDate),
        new Question('q2', 'Q2', 1, mockDate),
      ]
      const answers = [new Answer('a1', 'q1', 'A1', mockDate)]
      const doc = new Document('doc1', 'Test Doc', questions, answers, mockDate)

      const summary = doc.getSummary()

      expect(summary).toEqual({
        id: 'doc1',
        title: 'Test Doc',
        questionCount: 2,
        answerCount: 1,
      })
    })
  })

  describe('toJSON', () => {
    it('should serialize document correctly', () => {
      const question = new Question('q1', 'Question', 0, mockDate)
      const answer = new Answer('a1', 'q1', 'Answer', mockDate)
      const doc = new Document('doc1', 'Test', [question], [answer], mockDate)

      const json = doc.toJSON()

      expect(json.id).toBe('doc1')
      expect(json.title).toBe('Test')
      expect(json.questions).toHaveLength(1)
      expect(json.answers).toHaveLength(1)
      expect(json.createdAt).toBe(mockDate.toISOString())
      expect(json.updatedAt).toBe(mockDate.toISOString())
    })
  })

  describe('questionCount and answerCount', () => {
    it('should return correct counts', () => {
      const questions = [
        new Question('q1', 'Q1', 0, mockDate),
        new Question('q2', 'Q2', 1, mockDate),
      ]
      const answers = [
        new Answer('a1', 'q1', 'A1', mockDate),
        new Answer('a2', 'q2', 'A2', mockDate),
      ]
      const doc = new Document('doc1', 'Test', questions, answers, mockDate)

      expect(doc.questionCount).toBe(2)
      expect(doc.answerCount).toBe(2)
    })
  })
})
