import * as WebSocket from 'ws'
import * as vscode from 'vscode'
import * as http from 'http'
import { WEB_CHATS } from '../constants/web-chats'
import { InitializeChatsMessage } from '@shared/types/websocket-message'

export class WebSocketServer {
  private context: vscode.ExtensionContext
  private server: http.Server
  private wss: WebSocket.Server
  private port: number
  private security_token: string
  private connections: Set<WebSocket> = new Set()

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.port = 55155
    this.security_token = 'gemini-coder'
    this.server = http.createServer(this.handleHttpRequest.bind(this))
    this.wss = new WebSocket.Server({ server: this.server })

    this.initialize_websocket_server()
    context.subscriptions.push({
      dispose: () => this.dispose()
    })
  }

  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
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
      (ws: WebSocket, request: http.IncomingMessage) => {
        // Verify security token
        const url = new URL(request.url || '', `http://localhost:${this.port}`)
        const token = url.searchParams.get('token')

        if (token != this.security_token) {
          ws.close(1008, 'Invalid security token')
          return
        }

        this.connections.add(ws)

        ws.on('close', () => {
          this.connections.delete(ws)
        })

        ws.on('error', (error) => {
          console.error('WebSocket error:', error)
          this.connections.delete(ws)
        })
      }
    )

    this.server.listen(this.port, () => {
      console.log(`WebSocket server is running on ws://localhost:${this.port}`)
    })
  }

  public async initialize_chats(text: string): Promise<void> {
    const is_connected =
      this.connections.size > 0 &&
      Array.from(this.connections).some((ws) => ws.readyState == WebSocket.OPEN)

    const config = vscode.workspace.getConfiguration()
    const ai_studio = WEB_CHATS.find((chat) => chat.label == 'AI Studio')!

    // Get the last used web chats from global state
    const last_used_web_chats = this.context.globalState.get<string[]>(
      'lastUsedWebChats',
      []
    )

    // Use the most recently used chat or AI Studio as default
    const selected_chat = last_used_web_chats[0]
      ? WEB_CHATS.find((chat) => chat.label == last_used_web_chats[0])
      : ai_studio

    let current_chat: InitializeChatsMessage['chats'][0] = {
      url: `${selected_chat?.url}`
    }

    if (!is_connected) {
      // Fallback to opening urls directly
      await vscode.env.clipboard.writeText(text)
      vscode.env.openExternal(vscode.Uri.parse(current_chat.url))
      return
    }

    // If AI Studio is selected, include model, system instructions and temperature
    if (selected_chat?.label == 'AI Studio') {
      const model =
        config.get<string>('geminiCoder.aiStudioModel') || 'gemini-2.0-flash'
      const temperature =
        config.get<number>('geminiCoder.aiStudioTemperature') || 0.5
      const system_instructions = config.get<string[]>(
        'geminiCoder.systemInstructions'
      )

      current_chat = {
        ...current_chat,
        system_instructions: system_instructions?.length
          ? system_instructions[0]
          : undefined,
        model,
        temperature
      }
    }

    const open_in_background =
      config.get<boolean>('geminiCoder.openWebChatsInBackground') ?? false

    const message: InitializeChatsMessage = {
      action: 'initialize-chats',
      text,
      open_in_background,
      chats: [current_chat]
    }

    const verbose = config.get<boolean>('geminiCoder.verbose')
    if (verbose) {
      console.debug('Initialize chats message:', message)
    }

    this.connections.forEach((ws) => {
      if (ws.readyState == WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    })
  }

  public dispose() {
    this.connections.forEach((ws) => {
      ws.close()
    })
    this.connections.clear()
    this.wss.close()
    this.server.close()
  }
}
