import {
  WebSocketMessage,
  InitializeChatsMessage
} from '@shared/types/websocket-message'
import browser from 'webextension-polyfill'

/**
 * Handle different types of incoming WebSocket messages
 */
export function handle_messages(message: WebSocketMessage) {
  if (message.action == 'initialize-chats') {
    handle_initialize_chats_message(message as InitializeChatsMessage)
  }
  // Add handlers for other message types as needed
}

/**
 * Handle initializing chats from VS Code
 */
async function handle_initialize_chats_message(message: InitializeChatsMessage) {
  // Store the prompt in extension storage for content script to access
  await browser.storage.local.set({ message })

  if (message.chats && message.chats.length > 0) {
    for (const chat of message.chats) {
      browser.tabs.create({
        url: `${chat.url}#gemini-coder`,
        active: !message.open_in_background
      })
    }
  }
}