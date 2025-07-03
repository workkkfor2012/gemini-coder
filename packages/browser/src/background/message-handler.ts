import {
  WebSocketMessage,
  InitializeChatsMessage,
  InitializeChatMessage,
  ApplyChatResponseMessage,
  StartSessionMessage,
  SendToSessionMessage
} from '@shared/types/websocket-message'
import browser from 'webextension-polyfill'
import { send_saved_websites, send_message_to_server } from './websocket'
import { is_message } from '@/utils/is-message'
import { GetTabDataResponse } from '@/types/responses'
import { image_url_to_base64 } from '@/utils/image-url-to-base64'

interface ChatQueueItem {
  message: InitializeChatsMessage
  remaining_chats: number
  current_index: number
  timeout_id?: number
}

// Global queue of chat initialization requests
const chat_queue: ChatQueueItem[] = []
let is_processing = false

// Session to tab mapping
const sessionTabs = new Map<string, number>()

const CHAT_INITIALIZATION_TIMEOUT = 5000

export const handle_messages = (message: WebSocketMessage) => {
  // 【无条件日志】确保函数被调用的第一时间就记录
  console.log(`🎬 [Browser Extension] ENTERED handle_messages function:`, {
    action: message.action,
    messageType: typeof message,
    hasAction: 'action' in message,
    timestamp: new Date().toISOString()
  })

  try {
    console.log(`🔍 [Browser Extension] Full message object:`, message)

    if (message.action == 'initialize-chats') {
      console.log(`📋 [Browser Extension] Routing to handle_initialize_chats_message`)
      handle_initialize_chats_message(message as InitializeChatsMessage)
    } else if (message.action == 'initialize-chat') {
      console.log(`💬 [Browser Extension] Routing to handle_initialize_chat_message`)
      handle_initialize_chat_message(message as InitializeChatMessage)
    } else if (message.action == 'start-session') {
      console.log(`🚀 [Browser Extension] ROUTING TO handle_start_session_message`)
      console.log(`🔍 [Browser Extension] start-session message details:`, {
        sessionId: (message as any).sessionId,
        initialPrompt: (message as any).initialPrompt?.substring(0, 100) + '...',
        chatConfigUrl: (message as any).chatConfig?.url,
        clientId: (message as any).client_id
      })
      handle_start_session_message(message as StartSessionMessage)
      console.log(`✅ [Browser Extension] RETURNED FROM handle_start_session_message`)
    } else if (message.action == 'send-to-session') {
      console.log(`📤 [Browser Extension] Routing to handle_send_to_session_message`)
      handle_send_to_session_message(message as SendToSessionMessage)
    } else {
      console.warn(`❓ [Browser Extension] Unknown action received: ${message.action}`)
    }

    console.log(`✅ [Browser Extension] handle_messages completed successfully for action: ${message.action}`)
  } catch (error) {
    console.error(`💥 [Browser Extension] CRITICAL ERROR in handle_messages:`)
    if (error instanceof Error) {
      console.error(`   Error name: ${error.name}`)
      console.error(`   Error message: ${error.message}`)
      console.error(`   Stack trace:`, error.stack)
    } else {
      console.error(`   Non-Error object:`, error)
    }
    console.error(`   Message that caused error:`, message)
  }
}

const generate_alphanumeric_id = async (
  keyspace: string,
  length: number = 3
): Promise<string> => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let attempts = 0

  while (attempts < 1000) {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    const storage_key = `${keyspace}:${result}`
    const existing = await browser.storage.local.get(storage_key)
    if (!existing[storage_key]) {
      return result
    }
    attempts++
  }

  throw new Error('Unable to generate a unique ID after maximum attempts')
}

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

  // OpenRouter is a special case, in model handling via search params
  if (current_chat.url == 'https://openrouter.ai/chat') {
    // https://openrouter.ai/chat?models=openrouter/quasar-alpha
    const search_params = new URLSearchParams()
    if (current_chat.model) {
      search_params.set('models', current_chat.model)
    }
    const open_router_url = `${
      current_chat.url
    }?${search_params.toString()}#gemini-coder-${batch_id}`
    browser.tabs.create({
      url: open_router_url,
      active: true
    })
  } else {
    // Open the tab with the current chat URL
    browser.tabs.create({
      url: `${current_chat.url}#gemini-coder-${batch_id}`,
      active: true
    })
  }

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

const start_processing = async () => {
  if (!is_processing && chat_queue.length > 0) {
    is_processing = true
    await process_next_chat()
  }
}

// Will be deprecated
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

const handle_initialize_chat_message = async (
  message: InitializeChatMessage
) => {
  const chat_config = {
    url: message.url,
    model: message.model,
    temperature: message.temperature,
    top_p: message.top_p,
    system_instructions: message.system_instructions,
    options: message.options
  }

  const chats_message: InitializeChatsMessage = {
    action: 'initialize-chats',
    text: message.text,
    chats: [chat_config],
    client_id: message.client_id
  }

  handle_initialize_chats_message(chats_message)
}

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

const handle_get_tab_data = async (
  callback: (tab_data?: GetTabDataResponse) => void
) => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    const url = tabs[0]?.url
    const favicon_url = tabs[0]?.favIconUrl

    if (!url || !url.startsWith('http')) {
      throw new Error('URL is not valid')
    }

    let html = ''
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    html = await response.text()

    let favicon_base64: string | undefined
    if (favicon_url) {
      try {
        favicon_base64 = (await image_url_to_base64(favicon_url)) || undefined
      } catch (faviconError) {
        console.error('Error converting favicon to base64:', faviconError)
      }
    }

    callback({
      html,
      favicon_base64
    })
  } catch (error) {
    console.error('Error getting tab data:', error)
    callback()
  }
}

export const setup_message_listeners = () => {
  browser.runtime.onMessage.addListener(
    (message: any, _: any, sendResponse: any): any => {
      if (is_message(message)) {
        if (message.action == 'update-saved-websites' && message.websites) {
          send_saved_websites(message.websites)
        } else if (message.action == 'chat-initialized') {
          handle_chat_initialized()
        } else if (message.action == 'apply-chat-response') {
          send_message_to_server({
            action: 'apply-chat-response',
            client_id: message.client_id
          } as ApplyChatResponseMessage)
        } else if (message.action == 'get-tab-data') {
          handle_get_tab_data((tab_data) => {
            sendResponse(tab_data)
          })
          return true
        }
      }
      return false // For messages that don't need a response
    }
  )
}

// 处理开始新会话的消息
const handle_start_session_message = async (message: StartSessionMessage) => {
  // 【无条件日志】函数入口立即记录
  console.log(`🎯 [Browser Extension] ENTERED handle_start_session_message function`)
  console.log(`🔍 [Browser Extension] Message validation:`, {
    hasSessionId: !!message.sessionId,
    hasChatConfig: !!message.chatConfig,
    hasUrl: !!message.chatConfig?.url,
    hasInitialPrompt: !!message.initialPrompt,
    sessionId: message.sessionId,
    url: message.chatConfig?.url,
    client_id: message.client_id,
    promptLength: message.initialPrompt?.length || 0
  })

  try {
    // 验证必要字段
    if (!message.chatConfig || !message.chatConfig.url) {
      console.error(`❌ [Browser Extension] Invalid message: missing chatConfig or URL`)
      return
    }

    const targetUrl = `${message.chatConfig.url}#cwc-session-${message.sessionId}`
    console.log(`🌐 [Browser Extension] Preparing to create tab with URL: ${targetUrl}`)

    // 【关键修改：使用Promise方式处理webextension-polyfill API】
    console.log(`🚀 [Browser Extension] Calling browser.tabs.create...`)

    try {
      const tab = await browser.tabs.create({
        url: targetUrl,
        active: true
      })

      if (!tab) {
        console.error(`💣 [Browser Extension] Tab creation returned null/undefined`)
        return
      }

      console.log(`📑 [Browser Extension] Tab created successfully:`, {
        tabId: tab.id,
        url: tab.url,
        sessionId: message.sessionId,
        status: tab.status
      })

      if (tab.id) {
        // 记录会话ID到标签页的映射
        sessionTabs.set(message.sessionId, tab.id)
        console.log(`🗂️ [Browser Extension] Session mapping stored: ${message.sessionId} -> ${tab.id}`)

        // 等待标签页加载完成后发送初始化消息
        const listener = (tabId: number, changeInfo: any) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            console.log(`✅ [Browser Extension] Tab ${tabId} loading complete, preparing initialization message`)
            browser.tabs.onUpdated.removeListener(listener)

            const initMessage = {
              action: 'initialize-session',
              sessionId: message.sessionId,
              initialPrompt: message.initialPrompt,
              chatConfig: message.chatConfig,
              client_id: message.client_id
            }

            console.log(`📨 [Browser Extension] Sending initialization message to tab ${tab.id}:`, initMessage)

            // 向标签页发送初始化消息
            browser.tabs.sendMessage(tab.id!, initMessage).then(() => {
              console.log(`✅ [Browser Extension] Initialization message sent successfully to tab ${tab.id}`)
            }).catch((error) => {
              console.error(`❌ [Browser Extension] Error sending message to tab ${tab.id}:`, error)
            })
          }
        }

        browser.tabs.onUpdated.addListener(listener)
        console.log(`👂 [Browser Extension] Added tab update listener for tab ${tab.id}`)
      } else {
        console.error(`❌ [Browser Extension] Tab created but tab.id is undefined:`, tab)
      }
    } catch (tabCreateError) {
      console.error(`💣 [Browser Extension] Error creating tab:`, tabCreateError)
      console.error(`💣 [Browser Extension] Target URL was:`, targetUrl)
    }

    console.log(`✅ [Browser Extension] browser.tabs.create call completed (async)`)

  } catch (error) {
    console.error(`💥 [Browser Extension] EXCEPTION in handle_start_session_message:`)
    if (error instanceof Error) {
      console.error(`   Error name: ${error.name}`)
      console.error(`   Error message: ${error.message}`)
      console.error(`   Stack trace:`, error.stack)
    } else {
      console.error(`   Non-Error object:`, error)
    }
    console.error(`   Message that caused error:`, message)
  }

  console.log(`🏁 [Browser Extension] EXITING handle_start_session_message function`)
}

// 处理发送到会话的消息
const handle_send_to_session_message = async (message: SendToSessionMessage) => {
  try {
    const tabId = sessionTabs.get(message.sessionId)

    if (tabId) {
      // 检查标签页是否仍然存在
      try {
        await browser.tabs.get(tabId)

        // 向标签页发送消息
        browser.tabs.sendMessage(tabId, {
          action: 'send-message',
          prompt: message.prompt
        })
      } catch (error) {
        // 标签页不存在，从映射中移除
        sessionTabs.delete(message.sessionId)
        console.warn(`Tab for session ${message.sessionId} no longer exists`)
      }
    } else {
      console.warn(`No tab found for session ${message.sessionId}`)
    }
  } catch (error) {
    console.error('Failed to send message to session:', error)
  }
}
