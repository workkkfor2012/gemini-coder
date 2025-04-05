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
let ping_interval_id: number | null = null // Store interval ID for ping

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

  try {
    // Temporarily disable server health check for debugging handshake issues
    // const isHealthy = await checkServerHealth()
    // if (!isHealthy) {
    //   console.debug('Server health check failed, retrying in 5 seconds...')
    //   setTimeout(() => {
    //     is_reconnecting = false
    //     connect_websocket()
    //   }, CONFIG.RECONNECT_DELAY)
    //   return
    // }

    // Get manifest data for version
    const manifest = browser.runtime.getManifest()
    const version = manifest.version

    websocket = new WebSocket(
      `ws://localhost:${DEFAULT_PORT}?token=${SECURITY_TOKENS.BROWSERS}&version=${version}`
    )

    websocket.onopen = () => {
      // Log successful connection with server address
      const server_address = `ws://localhost:${DEFAULT_PORT}`
      console.info(`Successfully connected to WebSocket server at ${server_address}`)
      is_reconnecting = false

      // Send any saved websites immediately after connection is established
      send_current_saved_websites()

      // Start sending pings every 20 seconds to keep connection alive
      if (ping_interval_id) clearInterval(ping_interval_id); // Clear previous interval if any
      ping_interval_id = setInterval(() => {
        send_message_to_server({ action: 'ping' });
      }, 20000) as unknown as number; // Send ping every 20 seconds
    }

    websocket.onmessage = async (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage
      console.debug(message)
      handle_messages(message)
    }

    websocket.onclose = () => {
      console.log('Disconnected from VS Code, attempting to reconnect...')
      if (ping_interval_id) clearInterval(ping_interval_id); // Stop sending pings
      ping_interval_id = null;
      websocket = null
      is_reconnecting = false
      setTimeout(connect_websocket, CONFIG.RECONNECT_DELAY)
    }

    websocket.onerror = (event) => {
      // Log the error event for more details
      console.error('WebSocket error observed:', event)
      if (ping_interval_id) clearInterval(ping_interval_id); // Stop sending pings
      ping_interval_id = null;
      is_reconnecting = false
      websocket = null
      // Schedule reconnection on error as well
      setTimeout(connect_websocket, CONFIG.RECONNECT_DELAY)
    }
  } catch (error) {
    // Also clear ping interval in case of connection setup error
    if (ping_interval_id) clearInterval(ping_interval_id);
    ping_interval_id = null;
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
      is_selection: site.is_selection
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