import {
  WebSocketMessage,
  InitializeChatsMessage
} from '@shared/types/websocket-messages'
import browser from 'webextension-polyfill'

// Store WebSocket instance
let websocket: WebSocket | null = null
const RECONNECT_DELAY = 5000 // 5 seconds
const KEEPALIVE_ALARM_NAME = 'websocket-keepalive'
const KEEPALIVE_INTERVAL = 1 // minutes

function connect_web_socket() {
  if (websocket?.readyState == WebSocket.OPEN) return

  try {
    websocket = new WebSocket('ws://localhost:9393?token=gemini-coder')

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
