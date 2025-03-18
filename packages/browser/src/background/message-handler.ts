import {
  WebSocketMessage,
  InitializeChatsMessage
} from '@shared/types/websocket-message'
import browser from 'webextension-polyfill'
import { send_saved_websites } from './websocket'
import { is_message } from '@/utils/is-message'

/**
 * Handle different types of incoming WebSocket messages
 */
export const handle_messages = (message: WebSocketMessage) => {
  if (message.action == 'initialize-chats') {
    handle_initialize_chats_message(message as InitializeChatsMessage)
  }
  // Add handlers for other message types as needed
}

/**
 * Generates a unique 3-character alphanumeric ID not currently in use
 */
const generate_alphanumeric_id = async (
  keyspace: string,
  length: number = 3
): Promise<string> => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  while (true) {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    const storage_key = `${keyspace}:${result}`
    const existing = await browser.storage.local.get(storage_key)
    if (!existing[storage_key]) {
      return result
    }
  }
}

/**
 * Handle initializing chats from VS Code
 */
const handle_initialize_chats_message = async (
  message: InitializeChatsMessage
) => {
  if (message.chats && message.chats.length > 0) {
    for (const chat of message.chats) {
      // Generate a unique 2-character alphanumeric batch ID
      const batch_id = await generate_alphanumeric_id('chat-init')
      // Store the message with a unique key that includes the batch ID for each chat individually
      await browser.storage.local.set({ [`chat-init:${batch_id}`]: message })
      browser.tabs.create({
        url: `${chat.url}#gemini-coder-${batch_id}`,
        active: true
      })
    }
  }
}

/**
 * Set up message listeners for extension
 */
export const setup_message_listeners = () => {
  browser.runtime.onMessage.addListener((message, _, sendResponse): any => {
    if (
      is_message(message) &&
      message.action == 'update-saved-websites' &&
      message.websites
    ) {
      send_saved_websites(message.websites)
    }
  })
}
