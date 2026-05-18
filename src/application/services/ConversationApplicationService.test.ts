import { describe, it, expect, beforeEach } from 'vitest'
import { DocumentApplicationService } from './DocumentApplicationService'
import { ConversationApplicationService } from './ConversationApplicationService'
import { InMemoryDocumentRepository } from '../../infrastructure/storage/InMemoryDocumentRepository'
import { SimpleEventBus } from '../../domain/events'
import { NotFoundError } from '../../domain/errors'

describe('ConversationApplicationService', () => {
  let docService: DocumentApplicationService
  let convService: ConversationApplicationService
  let eventBus: SimpleEventBus

  beforeEach(() => {
    eventBus = new SimpleEventBus()
    const repo = new InMemoryDocumentRepository()
    docService = new DocumentApplicationService(repo, eventBus)
    convService = new ConversationApplicationService(repo, eventBus)
  })

  it('should send a question message', async () => {
    const doc = await docService.createDocument('Test Doc', ['Q1', 'Q2'])
    const questionId = doc.questions[0]!.id

    await convService.sendMessage(doc.id, 'What is this?', 'question', questionId)

    const updated = await docService.getDocument(doc.id)
    expect(updated?.conversation.messageCount).toBe(1)
    expect(updated?.conversation.messages[0]?.content).toBe('What is this?')
  })

  it('should send an answer message', async () => {
    const doc = await docService.createDocument('Test Doc')

    await convService.sendMessage(doc.id, 'Just an answer', 'answer')

    const updated = await docService.getDocument(doc.id)
    expect(updated?.conversation.messageCount).toBe(1)
  })

  it('should answer a question', async () => {
    const doc = await docService.createDocument('Test Doc', ['Q1'])
    const questionId = doc.questions[0]!.id

    await convService.answerQuestion(doc.id, questionId, 'This is the answer')

    const updated = await docService.getDocument(doc.id)
    expect(updated?.conversation.messageCount).toBe(1)
    const message = updated?.conversation.messages[0]
    expect(message?.type).toBe('answer')
    expect(message?.questionId).toBe(questionId)
  })

  it('should throw when answering non-existent question', async () => {
    const doc = await docService.createDocument('Test Doc')

    await expect(convService.answerQuestion(doc.id, 'non-existent', 'Answer')).rejects.toThrow(NotFoundError)
  })

  it('should edit a message', async () => {
    const doc = await docService.createDocument('Test Doc')
    await convService.sendMessage(doc.id, 'Original', 'question')
    const updated = await docService.getDocument(doc.id)
    const messageId = updated!.conversation.messages[0]!.id

    await convService.editMessage(doc.id, messageId, 'Edited content')

    const updated2 = await docService.getDocument(doc.id)
    expect(updated2?.conversation.messages[0]?.content).toBe('Edited content')
    expect(updated2?.conversation.messages[0]?.isEdited).toBe(true)
  })

  it('should throw when editing non-existent message', async () => {
    const doc = await docService.createDocument('Test Doc')

    await expect(convService.editMessage(doc.id, 'non-existent', 'New')).rejects.toThrow(NotFoundError)
  })

  it('should delete a message', async () => {
    const doc = await docService.createDocument('Test Doc')
    await convService.sendMessage(doc.id, 'To delete', 'question')
    const updated = await docService.getDocument(doc.id)
    const messageId = updated!.conversation.messages[0]!.id

    await convService.deleteMessage(doc.id, messageId)

    const updated2 = await docService.getDocument(doc.id)
    expect(updated2?.conversation.messageCount).toBe(0)
  })

  it('should emit MessageSentEvent', async () => {
    const doc = await docService.createDocument('Test Doc')
    let eventFired = false

    eventBus.on('MessageSent', () => {
      eventFired = true
    })

    await convService.sendMessage(doc.id, 'Hello', 'question')

    expect(eventFired).toBe(true)
  })
})
