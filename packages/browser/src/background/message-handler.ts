import {
  WebSocketMessage,
  InitializeChatsMessage
} from '@shared/types/websocket-message'
import browser from 'webextension-polyfill'
import { send_saved_websites } from './websocket'
import { is_message } from '@/utils/is-message'

// Queue to manage multiple chat initialization
interface ChatQueueItem {
  message: InitializeChatsMessage
  remaining_chats: number
  current_index: number
}

// Global queue of chat initialization requests
const chat_queue: ChatQueueItem[] = []
let is_processing = false

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
 * Process the next chat in the current queue item
 */
const process_next_chat = async () => {
  if (chat_queue.length == 0 || !is_processing) {
    is_processing = false
    return
  }

  const current_queue_item = chat_queue[0]

  if (
    current_queue_item.current_index >= current_queue_item.message.chats.length
  ) {
    // Current queue item is complete, remove it and process the next one
    chat_queue.shift()

    if (chat_queue.length > 0) {
      // Start processing the next queue item
      chat_queue[0].current_index = 0
      await process_next_chat()
    } else {
      is_processing = false
    }
    return
  }

  const current_chat =
    current_queue_item.message.chats[current_queue_item.current_index]

  // Generate a unique 3-character alphanumeric batch ID
  const batch_id = await generate_alphanumeric_id('chat-init')

  // Store the message with a unique key that includes the batch ID
  await browser.storage.local.set({
    [`chat-init:${batch_id}`]: current_queue_item.message,
    [`chat-queue-index:${batch_id}`]: current_queue_item.current_index
  })

  // Open the tab with the current chat URL
  browser.tabs.create({
    url: `${current_chat.url}#gemini-coder-${batch_id}`,
    active: true
  })

  // Increment the current index for the next chat
  current_queue_item.current_index++
}

/**
 * Start processing the queue if not already processing
 */
const start_processing = async () => {
  if (!is_processing && chat_queue.length > 0) {
    is_processing = true
    await process_next_chat()
  }
}

/**
 * Handle initializing chats from VS Code
 */
const handle_initialize_chats_message = async (
  message: InitializeChatsMessage
) => {
  if (message.chats && message.chats.length > 0) {
    // Add the new request to the queue
    chat_queue.push({
      message,
      remaining_chats: message.chats.length,
      current_index: 0
    })

    // Start processing if not already doing so
    await start_processing()
  }
}

/**
 * Handler for chat-initialized messages from content scripts
 */
const handle_chat_initialized = async () => {
  // Process the next chat in the queue if one exists
  if (chat_queue.length > 0) {
    chat_queue[0].remaining_chats--
    await process_next_chat()
  }
}

/**
 * Set up message listeners for extension
 */
export const setup_message_listeners = () => {
  browser.runtime.onMessage.addListener((message, _, sendResponse): any => {
    if (is_message(message)) {
      if (message.action == 'update-saved-websites' && message.websites) {
        send_saved_websites(message.websites)
      } else if (message.action == 'chat-initialized') {
        handle_chat_initialized()
      }
    }
  })
}
