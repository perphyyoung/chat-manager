import { describe, it, expect } from 'vitest'
import { Conversation } from './Conversation'
import { Message } from './Message'
import { NotFoundError } from '../errors'

describe('Conversation', () => {
  it('should create a conversation with id', () => {
    const conversation = new Conversation('conv1')

    expect(conversation.id).toBe('conv1')
    expect(conversation.messages).toEqual([])
    expect(conversation.messageCount).toBe(0)
  })

  it('should create a conversation with initial messages', () => {
    const message = new Message('m1', 'question', 'Hello?')
    const conversation = new Conversation('conv1', [message])

    expect(conversation.messageCount).toBe(1)
  })

  it('should add a message', () => {
    const conversation = new Conversation('conv1')
    const message = new Message('m1', 'question', 'Hello?')

    conversation.addMessage(message)

    expect(conversation.messageCount).toBe(1)
    expect(conversation.getMessageById('m1')).toBe(message)
  })

  it('should remove a message', () => {
    const message = new Message('m1', 'question', 'Hello?')
    const conversation = new Conversation('conv1', [message])

    conversation.removeMessage('m1')

    expect(conversation.messageCount).toBe(0)
  })

  it('should throw error when removing non-existent message', () => {
    const conversation = new Conversation('conv1')

    expect(() => conversation.removeMessage('non-existent')).toThrow(NotFoundError)
  })

  it('should get message by id', () => {
    const message = new Message('m1', 'question', 'Hello?')
    const conversation = new Conversation('conv1', [message])

    const found = conversation.getMessageById('m1')

    expect(found).toBe(message)
  })

  it('should return undefined for non-existent message id', () => {
    const conversation = new Conversation('conv1')

    const found = conversation.getMessageById('non-existent')

    expect(found).toBeUndefined()
  })

  it('should get messages by question id', () => {
    const message1 = new Message('m1', 'question', 'Q1?', 'q1')
    const message2 = new Message('m2', 'answer', 'A1', 'q1')
    const message3 = new Message('m3', 'question', 'Q2?', 'q2')
    const conversation = new Conversation('conv1', [message1, message2, message3])

    const messages = conversation.getMessagesByQuestionId('q1')

    expect(messages).toHaveLength(2)
    expect(messages).toContain(message1)
    expect(messages).toContain(message2)
  })

  it('should get question-answer pair', () => {
    const question = new Message('m1', 'question', 'Q1?', 'q1')
    const answer = new Message('m2', 'answer', 'A1', 'q1')
    const conversation = new Conversation('conv1', [question, answer])

    const pair = conversation.getQuestionAnswerPair('q1')

    expect(pair.question).toBe(question)
    expect(pair.answer).toBe(answer)
  })

  it('should return empty pair when no messages for question', () => {
    const conversation = new Conversation('conv1')

    const pair = conversation.getQuestionAnswerPair('q1')

    expect(pair.question).toBeUndefined()
    expect(pair.answer).toBeUndefined()
  })

  it('should get last message', () => {
    const message1 = new Message('m1', 'question', 'First')
    const message2 = new Message('m2', 'answer', 'Last')
    const conversation = new Conversation('conv1', [message1, message2])

    const last = conversation.getLastMessage()

    expect(last).toBe(message2)
  })

  it('should return undefined for last message when empty', () => {
    const conversation = new Conversation('conv1')

    const last = conversation.getLastMessage()

    expect(last).toBeUndefined()
  })

  it('should serialize to JSON correctly', () => {
    const message = new Message('m1', 'question', 'Test')
    const conversation = new Conversation('conv1', [message])

    const json = conversation.toJSON()

    expect(json.id).toBe('conv1')
    expect(json.messages).toHaveLength(1)
    expect(json.messages[0]!.content).toBe('Test')
  })
})
