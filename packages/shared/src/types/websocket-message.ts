export type ChatInstance = {
  url: string
  model?: string
  temperature?: number
  system_instructions?: string
}

export type InitializeChatsMessage = {
  action: 'initialize-chats'
  open_in_background: boolean
  text: string
  chats: ChatInstance[]
}

export type WebSocketMessage = InitializeChatsMessage
