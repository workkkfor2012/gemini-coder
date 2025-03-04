import * as WebSocket from 'ws'
import * as vscode from 'vscode'
import * as http from 'http'
import { InitializeChatsMessage } from '@shared/types/websocket-message'
import { CHATBOTS } from '@shared/constants/chatbots'

export class WebSocketServer {
  private context: vscode.ExtensionContext
  private server: http.Server
  private wss: WebSocket.WebSocketServer
  private port: number
  private security_token: string
  private connections: Set<WebSocket.WebSocket> = new Set()
  private _on_connection_status_change: vscode.EventEmitter<boolean> =
    new vscode.EventEmitter<boolean>()
  private ping_interval: NodeJS.Timeout | undefined

  public readonly on_connection_status_change: vscode.Event<boolean> =
    this._on_connection_status_change.event

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.port = 55155
    this.security_token = 'gemini-coder'
    this.server = http.createServer(this.handle_http_request.bind(this))

    this.wss = new WebSocket.WebSocketServer({ server: this.server })

    this.initialize_websocket_server()
    this.start_ping_interval()
    context.subscriptions.push({
      dispose: () => this.dispose()
    })
  }

  private handle_http_request(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) {
    if (req.url == '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
      return
    }

    // Handle other HTTP requests
    res.writeHead(404)
    res.end()
  }

  private initialize_websocket_server() {
    this.wss.on(
      'connection',
      (ws: WebSocket.WebSocket, request: http.IncomingMessage) => {
        // Verify security token
        const url = new URL(request.url || '', `http://localhost:${this.port}`)
        const token = url.searchParams.get('token')

        if (token != this.security_token) {
          ws.close(1008, 'Invalid security token')
          return
        }

        this.connections.add(ws)
        this._on_connection_status_change.fire(this.is_connected())

        ws.on('close', () => {
          this.connections.delete(ws)
          this._on_connection_status_change.fire(this.is_connected())
        })

        ws.on('error', (error) => {
          console.error('WebSocket error:', error)
          this.connections.delete(ws)
          this._on_connection_status_change.fire(this.is_connected())
        })
      }
    )

    this.server.listen(this.port, () => {
      console.log(`WebSocket server is running on ws://localhost:${this.port}`)
    })
  }

  private start_ping_interval() {
    // Clear any existing interval
    if (this.ping_interval) {
      clearInterval(this.ping_interval)
    }

    // Set up ping every 10 seconds
    this.ping_interval = setInterval(() => {
      this.ping_clients()
    }, 10000)
  }

  private ping_clients() {
    let dead_connections: WebSocket.WebSocket[] = []

    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.WebSocket.OPEN) {
        try {
          ws.send('ping')
        } catch (error) {
          console.error('Error sending ping to client:', error)
          dead_connections.push(ws)
        }
      } else if (
        ws.readyState == WebSocket.WebSocket.CLOSED ||
        ws.readyState == WebSocket.WebSocket.CLOSING
      ) {
        dead_connections.push(ws)
      }
    })

    // Clean up dead connections
    dead_connections.forEach((ws) => {
      this.connections.delete(ws)
    })

    if (dead_connections.length > 0) {
      this._on_connection_status_change.fire(this.is_connected())
    }
  }

  public is_connected(): boolean {
    return (
      this.connections.size > 0 &&
      Array.from(this.connections).some(
        (ws) => ws.readyState == WebSocket.WebSocket.OPEN
      )
    )
  }

  public async initialize_chats(
    text: string,
    preset_indices: number[]
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration()
    const open_in_background =
      config.get<boolean>('geminiCoder.webChatsInBackground') ?? false
    const web_chat_presets =
      config.get<any[]>('geminiCoder.presets') ?? []

      console.log(preset_indices)
console.log(web_chat_presets)

    const message: InitializeChatsMessage = {
      action: 'initialize-chats',
      text,
      open_in_background,
      chats: preset_indices.map((idx) => {
        const preset = web_chat_presets[idx]
        const chatbot = CHATBOTS[preset.chatbot]
        return {
          url: chatbot.url,
          model: preset.model,
          temperature: preset.temperature,
          system_instructions: preset.systemInstructions
        }
      })
    }

    const verbose = config.get<boolean>('geminiCoder.verbose')
    if (verbose) {
      console.debug('Initialize chats message:', message)
    }

    this.connections.forEach((ws) => {
      if (ws.readyState == WebSocket.WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    })
  }

  public dispose() {
    // Clear the ping interval when disposing
    if (this.ping_interval) {
      clearInterval(this.ping_interval)
      this.ping_interval = undefined
    }

    this.connections.forEach((ws) => {
      ws.close()
    })
    this.connections.clear()
    this.wss.close()
    this.server.close()
    this._on_connection_status_change.dispose()
  }
}
