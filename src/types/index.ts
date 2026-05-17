export interface Question {
  id: string
  text: string
  order: number
}

export interface Message {
  id: string
  type: 'question' | 'answer'
  content: string
  questionId?: string
}

export interface Conversation {
  id: string
  messages: Message[]
}

export interface Document {
  id: string
  title: string
  questions: Question[]
  conversation: Conversation
}
