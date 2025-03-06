const WebSocket = require('ws')
const http = require('http')
const process = require('process')

const { DEFAULT_PORT, SECURITY_TOKENS } = require('../../../shared/src/constants/websocket')

const PORT = DEFAULT_PORT
const SECURITY_TOKEN_BROWSERS = SECURITY_TOKENS.BROWSERS
const SECURITY_TOKEN_VSCODE = SECURITY_TOKENS.VSCODE

const vscode_clients = new Set()
const browser_clients = new Set()

// Create HTTP server
const server = http.createServer((req, res) => {
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
const wss = new WebSocket.WebSocketServer({ server })
const connections = new Set()

// Notify VS Code clients about browser connection status
function notifyVSCodeClients() {
  const has_connected_browsers = browser_clients.size > 0
  const message = JSON.stringify({
    action: 'browser-connection-status',
    has_connected_browsers
  })

  vscode_clients.forEach((client) => {
    if (client.readyState == WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// Log server start information
console.log(`Starting WebSocket server process (PID: ${process.pid})`)

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
  // Verify security token
  const url = new URL(request.url || '', `http://localhost:${PORT}`)
  const token = url.searchParams.get('token')

  if (token != SECURITY_TOKEN_BROWSERS && token != SECURITY_TOKEN_VSCODE) {
    ws.close(1008, 'Invalid security token')
    return
  }

  // Track if this is a browser connection
  const is_browser_client = token == SECURITY_TOKEN_BROWSERS

  if (is_browser_client) {
    browser_clients.add(ws)
    console.log(
      `Browser client connected. Total browsers: ${browser_clients.size}`
    )
    notifyVSCodeClients() // Notify when a browser connects
  } else {
    vscode_clients.add(ws)
    console.log('VS Code client connected')
    // Send initial status to new VS Code client
    ws.send(
      JSON.stringify({
        action: 'browser-connection-status',
        has_connected_browsers: browser_clients.size > 0
      })
    )
  }

  connections.add(ws)

  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const msg_string = message.toString()

      // Handle ping message specially
      if (msg_string == 'ping') {
        // Just keep the connection alive, no response needed
        return
      }

      const msg_data = JSON.parse(msg_string)

      // Broadcast message to all other clients if it's an initialize-chats action
      if (msg_data.action == 'initialize-chats') {
        connections.forEach((client) => {
          if (client !== ws && client.readyState == WebSocket.OPEN) {
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
    if (is_browser_client) {
      browser_clients.delete(ws)
      console.log(
        `Browser client disconnected. Total browsers: ${browser_clients.size}`
      )
      notifyVSCodeClients() // Notify when a browser disconnects
    } else {
      vscode_clients.delete(ws)
      console.log('VS Code client disconnected')
    }
    connections.delete(ws)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
    if (is_browser_client) {
      browser_clients.delete(ws)
      console.log(
        `Browser client error disconnect. Total browsers: ${browser_clients.size}`
      )
      notifyVSCodeClients() // Notify when a browser disconnects due to error
    } else {
      vscode_clients.delete(ws)
    }
    connections.delete(ws)
  })
})

// Start server
server.listen(PORT, () => {
  console.log(`WebSocket server is running on ws://localhost:${PORT}`)
})

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  shutdown()
})

process.on('SIGTERM', () => {
  shutdown()
})

function shutdown() {
  console.log('Shutting down WebSocket server...')

  // Close all connections
  connections.forEach((ws) => {
    ws.close()
  })
  connections.clear()
  vscode_clients.clear()
  browser_clients.clear()

  // Close server
  wss.close()
  server.close(() => {
    console.log('WebSocket server stopped')
    process.exit(0)
  })
}
