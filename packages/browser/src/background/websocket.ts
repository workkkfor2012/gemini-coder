import { WebSocketMessage } from '@shared/types/websocket-message'
import { handle_messages } from './message-handler'
import { CONFIG } from './config'
import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'
import browser from 'webextension-polyfill'
import type { Website } from '@ui/components/browser/SavedWebsites'
import localforage from 'localforage'

// Store WebSocket instance and connection state
let websocket: WebSocket | null = null
let is_reconnecting = false

/**
 * Check if the server is healthy before attempting connection
 */
export async function check_server_health(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${DEFAULT_PORT}/health`)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Connect to WebSocket server with reconnection logic
 */
export async function connect_websocket() {
  // Prevent concurrent reconnection attempts
  if (is_reconnecting || websocket?.readyState === WebSocket.OPEN) {
    return
  }

  is_reconnecting = true

  try {
    // Check server health before attempting WebSocket connection
    const is_healthy = await check_server_health()
    if (!is_healthy) {
      console.debug('Server health check failed, retrying in 5 seconds...')
      setTimeout(() => {
        is_reconnecting = false
        connect_websocket()
      }, CONFIG.RECONNECT_DELAY)
      return
    }

    // Get manifest data for version
    const manifest = browser.runtime.getManifest()
    const version = manifest.version

    websocket = new WebSocket(
      `ws://localhost:${DEFAULT_PORT}?token=${SECURITY_TOKENS.BROWSERS}&version=${version}`
    )

    websocket.onopen = () => {
      console.log('✅ [Browser Extension] Connected with the VS Code!')
      is_reconnecting = false

      // Send any saved websites immediately after connection is established
      send_current_saved_websites()
    }

    websocket.onmessage = async (event) => {
      // 【关键修改：无条件日志】第一时间记录所有到达的消息
      console.log(`🔍 [Browser Extension] UNFILTERED MESSAGE RECEIVED:`, {
        data: event.data,
        type: typeof event.data,
        length: event.data?.length || 0,
        timestamp: new Date().toISOString()
      })

      try {
        const rawMessage = event.data
        console.log(`📥 [Browser Extension] Processing raw message:`, rawMessage)

        if (!rawMessage) {
          console.warn(`⚠️ [Browser Extension] Received empty or null message`)
          return
        }

        const message = JSON.parse(rawMessage) as WebSocketMessage
        console.log(`✨ [Browser Extension] Successfully parsed message:`, message)

        if (!message.action) {
          console.warn(`⚠️ [Browser Extension] Message missing action property:`, message)
          return
        }

        console.log(`🎯 [Browser Extension] About to handle action: "${message.action}"`)

        // 特别处理start-session消息
        if (message.action === 'start-session') {
          console.log(`🚀 [Browser Extension] SPECIAL HANDLING for start-session message:`, {
            sessionId: (message as any).sessionId,
            hasInitialPrompt: !!(message as any).initialPrompt,
            hasChatConfig: !!(message as any).chatConfig,
            chatConfigUrl: (message as any).chatConfig?.url
          })
        }

        handle_messages(message)

        console.log(`✅ [Browser Extension] Message handled successfully for action: ${message.action}`)
      } catch (error) {
        console.error(`❌ [Browser Extension] CRITICAL ERROR in message handler:`)
        if (error instanceof Error) {
          console.error(`   Error name: ${error.name}`)
          console.error(`   Error message: ${error.message}`)
          console.error(`   Stack trace:`, error.stack)
        } else {
          console.error(`   Non-Error object caught:`, error)
        }
        console.error(`   Raw event data that caused error:`, event.data)
        console.error(`   Event object:`, event)
      }
    }

    websocket.onclose = (event) => {
      console.log(`🚶 [Browser Extension] Disconnected from VS Code. Code: ${event.code}, Reason: ${event.reason}`)
      websocket = null
      is_reconnecting = false
      setTimeout(connect_websocket, CONFIG.RECONNECT_DELAY)
    }

    websocket.onerror = (error) => {
      console.error(`💥 [Browser Extension] WebSocket error:`, error)
      is_reconnecting = false
      websocket = null
    }
  } catch (error) {
    is_reconnecting = false
    setTimeout(connect_websocket, CONFIG.RECONNECT_DELAY)
  }
}

/**
 * Send saved websites to the WebSocket server
 */
export function send_saved_websites(websites: Website[]) {
  if (websocket?.readyState == WebSocket.OPEN) {
    const websites_to_send = websites.map((site) => ({
      url: site.url,
      title: site.title,
      content: site.content,
      favicon: site.favicon,
    }))

    const message = {
      action: 'update-saved-websites',
      websites: websites_to_send
    }

    console.log(message)
    websocket.send(JSON.stringify(message))
    return true
  }
  return false
}

/**
 * Send a generic message to the WebSocket server
 */
export function send_message_to_server(message: any) {
  if (websocket?.readyState == WebSocket.OPEN) {
    console.debug('Sending message to server:', message)
    websocket.send(JSON.stringify(message))
    return true
  }
  console.warn('WebSocket not connected, cannot send message:', message)
  return false
}

/**
 * Retrieve and send current saved websites
 */
async function send_current_saved_websites() {
  try {
    // Create a localforage instance with the same config as in use-websites-store.ts
    const websites_store = localforage.createInstance({
      name: 'gemini-coder-connector',
      storeName: 'websites'
    })

    const websites: Website[] = []

    await websites_store.iterate<any, void>((value) => {
      websites.push({
        url: value.url,
        title: value.title,
        content: value.content,
        favicon: value.favicon
      })
    })

    if (websites.length > 0) {
      send_saved_websites(websites)
    }
  } catch (error) {
    console.error('Error sending saved websites after connection:', error)
  }
}