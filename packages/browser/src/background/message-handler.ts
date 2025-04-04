import {
  WebSocketMessage,
  InitializeChatsMessage,
  InvokeFastReplaceMessage
} from '@shared/types/websocket-message'
// Define a simple type for the message coming from our Python server
type InjectTextMessage = {
  action: 'inject_text'
  text: string
}
import browser from 'webextension-polyfill'
import { send_saved_websites, send_message_to_server } from './websocket'
import { is_message } from '@/utils/is-message'

// Queue to manage multiple chat initialization
interface ChatQueueItem {
  message: InitializeChatsMessage
  remaining_chats: number
  current_index: number
  timeout_id?: number
}

// Global queue of chat initialization requests
const chat_queue: ChatQueueItem[] = []
let is_processing = false

const CHAT_INITIALIZATION_TIMEOUT = 5000

/**
 * Handle different types of incoming WebSocket messages
 */
export const handle_messages = (message: any) => { // Use 'any' for now to handle custom message
  // Check if it's a message defined in shared types first
  if (message && typeof message.action === 'string') {
    const known_message = message as WebSocketMessage // Cast for checks
    if (known_message.action == 'initialize-chats') {
      handle_initialize_chats_message(known_message as InitializeChatsMessage)
    }
    // Handle the custom inject_text action from Python server
    else if (message.action == 'inject_text' && typeof message.text === 'string') {
      handle_inject_text(message as InjectTextMessage)
    }
    // Add handlers for other known message types as needed
    else {
      console.warn('Received unknown WebSocket message action:', message.action)
    }
  } else {
    console.warn('Received invalid WebSocket message format:', message)
  }
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

  // Clear any existing timeout
  if (current_queue_item.timeout_id) {
    clearTimeout(current_queue_item.timeout_id)
    current_queue_item.timeout_id = undefined
  }

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

  // Store only the relevant information - the text and the current chat configuration
  await browser.storage.local.set({
    [`chat-init:${batch_id}`]: {
      text: current_queue_item.message.text,
      current_chat: current_chat,
      client_id: current_queue_item.message.client_id
    }
  })

  // Open the tab with the current chat URL
  browser.tabs.create({
    url: `${current_chat.url}#gemini-coder-${batch_id}`,
    active: true
  })

  // Increment the current index for the next chat
  current_queue_item.current_index++

  // Set a timeout to automatically proceed if no confirmation is received
  current_queue_item.timeout_id = setTimeout(() => {
    console.warn(
      `Chat initialization timeout for ${current_chat.url}. Moving to next chat.`
    )
    current_queue_item.remaining_chats--
    process_next_chat()
  }, CHAT_INITIALIZATION_TIMEOUT) as unknown as number
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
 * Handle inject_text message from the Python server
 */
const handle_inject_text = async (message: InjectTextMessage) => {
  console.log(`Received inject_text action with text: "${message.text}"`)
  try {
    // Find the active Gemini tab in the current window
    // --- DEBUG: Log all tab URLs before querying ---
    try {
      const allTabs = await browser.tabs.query({});
      console.log('All current tab URLs:', allTabs.map(t => t.url));
    } catch (logError) {
      console.error("Error querying all tabs for logging:", logError);
    }
    // --- END DEBUG ---

    // Find *any* AI Studio tab
    const tabs = await browser.tabs.query({
      url: '*://aistudio.google.com/*' // Keep the specific URL pattern
    });

    if (tabs.length === 1 && tabs[0].id && tabs[0].windowId) {
      // Found exactly one AI Studio tab
      const target_tab_id = tabs[0].id;
      const target_window_id = tabs[0].windowId;
      console.log(`Found unique AI Studio tab with ID: ${target_tab_id} in window ${target_window_id}.`);

      try {
        // 1. Focus the window containing the tab
        console.log(`Focusing window ${target_window_id}...`);
        await browser.windows.update(target_window_id, { focused: true });

        // 2. Activate the tab within the window
        console.log(`Activating tab ${target_tab_id}...`);
        await browser.tabs.update(target_tab_id, { active: true });

        // 3. Send the message to the now active tab
        console.log(`Attempting to send 'do_inject' message to tab ${target_tab_id}...`);
        // Send message to the content script (try without specifying frameId first)
        await browser.tabs.sendMessage(
          target_tab_id,
          {
            action: 'do_inject',
            text: message.text
          }
        );
        console.log(`Successfully sent 'do_inject' message to content script in tab ${target_tab_id}`);

      } catch (error) {
        console.error(`Error activating tab or sending message to tab ${target_tab_id}:`, error);
      }
    } else if (tabs.length === 0) {
      console.warn('No AI Studio tab found.');
    } else {
      console.warn(`Found ${tabs.length} AI Studio tabs. Cannot determine the correct target.`);
    }
    // Removed the redundant/incorrect else block that was causing the syntax error.
  } catch (error) {
    console.error('Error handling inject_text message:', error)
  }
}

/**
 * Handle chat-initialized messages from content scripts
 */
const handle_chat_initialized = async () => {
  // Process the next chat in the queue if one exists
  if (chat_queue.length > 0) {
    // Clear the timeout since we received confirmation
    if (chat_queue[0].timeout_id) {
      clearTimeout(chat_queue[0].timeout_id)
      chat_queue[0].timeout_id = undefined
    }

    chat_queue[0].remaining_chats--
    await process_next_chat()
  }
}

/**
 * Set up message listeners for extension
 */
export const setup_message_listeners = () => {
  browser.runtime.onMessage.addListener((message, _, __): any => {
    if (is_message(message)) {
      if (message.action == 'update-saved-websites' && message.websites) {
        send_saved_websites(message.websites)
      } else if (message.action == 'chat-initialized') {
        handle_chat_initialized()
      } else if (message.action == 'invoke-fast-replace') {
        send_message_to_server({
          action: 'invoke-fast-replace',
          client_id: message.client_id
        } as InvokeFastReplaceMessage)
      }
    }
  })
}
