import { WebSocketMessage } from '@shared/types/websocket-message'
import { update_extension_icon } from './icon'
import { handle_messages } from './message-handler'
import { CONFIG } from './config'
import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'

// Store WebSocket instance and connection state
let websocket: WebSocket | null = null
let is_reconnecting = false

/**
 * Check if the server is healthy before attempting connection
 */
export async function checkServerHealth(): Promise<boolean> {
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
  update_extension_icon({ connected: false })

  try {
    // Check server health before attempting WebSocket connection
    const isHealthy = await checkServerHealth()
    if (!isHealthy) {
      console.debug('Server health check failed, retrying in 5 seconds...')
      setTimeout(() => {
        is_reconnecting = false
        connect_websocket()
      }, CONFIG.RECONNECT_DELAY)
      return
    }

    websocket = new WebSocket(
      `ws://localhost:${DEFAULT_PORT}?token=${SECURITY_TOKENS.BROWSERS}`
    )

    websocket.onopen = () => {
      console.log('Connected with the VS Code!')
      is_reconnecting = false
      update_extension_icon({ connected: true })
    }

    websocket.onmessage = async (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage
      console.debug(message)
      handle_messages(message)
    }

    websocket.onclose = () => {
      console.log('Disconnected from VS Code, attempting to reconnect...')
      websocket = null
      is_reconnecting = false
      update_extension_icon({ connected: false })
      setTimeout(connect_websocket, CONFIG.RECONNECT_DELAY)
    }

    websocket.onerror = () => {
      is_reconnecting = false
      websocket = null
      update_extension_icon({ connected: false })
    }
  } catch (error) {
    is_reconnecting = false
    update_extension_icon({ connected: false })
    setTimeout(connect_websocket, CONFIG.RECONNECT_DELAY)
  }
}
