import {
  WebSocketMessage,
  InitializeChatsMessage
} from '@shared/types/websocket-message'
import browser from 'webextension-polyfill'

// Store WebSocket instance
let websocket: WebSocket | null = null
const RECONNECT_DELAY = 5000 // 5 seconds
const HEALTH_CHECK_URL = 'http://localhost:55155/health'
const KEEPALIVE_ALARM_NAME = 'websocket-keepalive'
const KEEPALIVE_INTERVAL = 1 // minutes

async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(HEALTH_CHECK_URL)
    return response.ok
  } catch {
    return false
  }
}

async function connect_web_socket() {
  if (websocket?.readyState == WebSocket.OPEN) return

  // Check server health before attempting WebSocket connection
  const isHealthy = await checkServerHealth()
  if (!isHealthy) {
    console.debug('Server health check failed, retrying in 5 seconds...')
    setTimeout(connect_web_socket, RECONNECT_DELAY)
    return
  }

  try {
    websocket = new WebSocket('ws://localhost:55155?token=gemini-coder')

    websocket.onopen = () => {
      console.log('Connected with the VS Code!')
    }

    websocket.onmessage = async (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage
      console.debug(message)

      if (message.action == 'initialize-chats') {
        handle_initialize_chats_message(message)
      }
    }

    websocket.onclose = () => {
      console.log('Disconnected from VS Code, attempting to reconnect...')
      websocket = null
      setTimeout(connect_web_socket, RECONNECT_DELAY)
    }
  } catch {
    // Silent error handling
    setTimeout(connect_web_socket, RECONNECT_DELAY)
  }
}

async function handle_initialize_chats_message(
  message: InitializeChatsMessage
) {
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

connect_web_socket()

if (!browser.browserAction) {
  // Setup keep-alive mechanism using alarms
  chrome.alarms.create(KEEPALIVE_ALARM_NAME, {
    periodInMinutes: KEEPALIVE_INTERVAL
  })

  // Listen for alarm events to keep the service worker alive
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name == KEEPALIVE_ALARM_NAME) {
      connect_web_socket()
    }
  })
}
