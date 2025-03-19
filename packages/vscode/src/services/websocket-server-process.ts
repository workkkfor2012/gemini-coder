const WebSocket = require('ws') // ws works only with requrie
import * as http from 'http'
import * as process from 'process'

import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'
import { Website } from '@shared/types/websocket-message'

interface BrowserClient {
  ws: WebSocket
  version: string
}

const vscode_clients: Set<WebSocket> = new Set()
let current_browser_client: BrowserClient | null = null
const connections: Set<WebSocket> = new Set()

let saved_websites: Website[] = []

// Create HTTP server
const server = http.createServer((req: any, res: any) => {
  if (req.url == '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok'
      })
    )
    return
  }

  res.writeHead(404)
  res.end()
})

// Create WebSocket server
const wss = new WebSocket.Server({ server })

// Notify VS Code clients about browser connection status
function notify_vscode_clients(): void {
  const has_connected_browser = current_browser_client !== null
  const message = JSON.stringify({
    action: 'browser-connection-status',
    has_connected_browsers: has_connected_browser
  })

  vscode_clients.forEach((client) => {
    if (client.readyState == WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// Send saved websites to a client
function send_saved_websites_to_client(client: WebSocket): void {
  if (saved_websites.length > 0 && client.readyState == WebSocket.OPEN) {
    client.send(
      JSON.stringify({
        action: 'update-saved-websites',
        websites: saved_websites
      })
    )
  }
}

// Send ping to browser client
function ping_clients(): void {
  if (
    current_browser_client &&
    current_browser_client.ws.readyState == WebSocket.OPEN
  ) {
    current_browser_client.ws.send(JSON.stringify({ action: 'ping' }))
  }
}

// Start periodic ping
setInterval(ping_clients, 10000) // Every 10 seconds

// Log server start information
console.log(`Starting WebSocket server process (PID: ${process.pid})`)

// Handle WebSocket connections
wss.on('connection', (ws: any, request: any) => {
  // Verify security token
  const url = new URL(request.url || '', `http://localhost:${DEFAULT_PORT}`)
  const token = url.searchParams.get('token')

  if (token != SECURITY_TOKENS.BROWSERS && token != SECURITY_TOKENS.VSCODE) {
    ws.close(1008, 'Invalid security token')
    return
  }

  // Track if this is a browser connection
  const is_browser_client = token == SECURITY_TOKENS.BROWSERS

  if (is_browser_client) {
    // Extract version from URL parameters
    const version = url.searchParams.get('version') || 'unknown'

    // Check if there is already a connected browser client
    if (
      current_browser_client &&
      current_browser_client.ws.readyState == WebSocket.OPEN
    ) {
      console.log(
        `Rejecting new browser client (version: ${version}) - another browser is already connected`
      )
      ws.close(1000, 'Another browser client is already connected')
      return
    }

    // Store the new browser client
    current_browser_client = { ws, version }
    console.log(`Browser client connected (version: ${version})`)
    notify_vscode_clients() // Notify when a browser connects
  } else {
    vscode_clients.add(ws)
    console.log('VS Code client connected')
    // Send initial status to new VS Code client
    ws.send(
      JSON.stringify({
        action: 'browser-connection-status',
        has_connected_browsers: current_browser_client !== null
      })
    )

    // Send saved websites to new VS Code client
    send_saved_websites_to_client(ws)
  }

  connections.add(ws)

  // Handle messages from clients
  ws.on('message', (message: any) => {
    try {
      const msg_string = message.toString()

      // Handle ping message specially
      if (msg_string == 'ping') {
        // Just keep the connection alive, no response needed
        return
      }

      const msg_data = JSON.parse(msg_string)

      // Handle different message types
      if (msg_data.action == 'initialize-chats') {
        connections.forEach((client) => {
          if (client !== ws && client.readyState == WebSocket.OPEN) {
            client.send(msg_string)
          }
        })
      } else if (msg_data.action == 'update-saved-websites') {
        // Store the updated websites
        saved_websites = msg_data.websites
        console.log(`Received ${saved_websites.length} saved websites`)

        // Forward to VS Code clients
        vscode_clients.forEach((client) => {
          if (client.readyState == WebSocket.OPEN) {
            client.send(msg_string)
          }
        })
      }
    } catch (error) {
      console.error('Error processing message:', error)
    }
  })

  // Handle client disconnection
  ws.on('close', () => {
    if (
      is_browser_client &&
      current_browser_client &&
      current_browser_client.ws === ws
    ) {
      const version = current_browser_client.version
      current_browser_client = null
      console.log(`Browser client disconnected (version: ${version})`)
      notify_vscode_clients() // Notify when the browser disconnects
    } else if (!is_browser_client) {
      vscode_clients.delete(ws)
      console.log('VS Code client disconnected')
    }
    connections.delete(ws)
  })

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error)
    if (
      is_browser_client &&
      current_browser_client &&
      current_browser_client.ws === ws
    ) {
      const version = current_browser_client.version
      current_browser_client = null
      console.log(`Browser client error disconnect (version: ${version})`)
      notify_vscode_clients() // Notify when the browser disconnects due to error
    } else if (!is_browser_client) {
      vscode_clients.delete(ws)
    }
    connections.delete(ws)
  })
})

// Start server
server.listen(DEFAULT_PORT, () => {
  console.log(`WebSocket server is running on ws://localhost:${DEFAULT_PORT}`)
})

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  shutdown()
})

process.on('SIGTERM', () => {
  shutdown()
})

function shutdown(): void {
  console.log('Shutting down WebSocket server...')

  // Close all connections
  connections.forEach((ws) => {
    ws.close()
  })
  connections.clear()
  vscode_clients.clear()
  current_browser_client = null
  saved_websites = []

  // Close server
  wss.close()
  server.close(() => {
    console.log('WebSocket server stopped')
    process.exit(0)
  })
}
