import * as WebSocket from 'ws'
import * as vscode from 'vscode'
import * as child_process from 'child_process'
import * as path from 'path'
import * as net from 'net'
import { InitializeChatsMessage } from '@shared/types/websocket-message'
import { CHATBOTS } from '@shared/constants/chatbots'

export class WebSocketManager {
  private context: vscode.ExtensionContext
  private port: number = 55155
  private security_token: string = 'gemini-coder-vscode'
  private client: WebSocket.WebSocket | null = null
  private _on_connection_status_change: vscode.EventEmitter<boolean> =
    new vscode.EventEmitter<boolean>()
  private reconnect_timer: NodeJS.Timeout | null = null
  private ping_interval: NodeJS.Timeout | null = null

  public readonly on_connection_status_change: vscode.Event<boolean> =
    this._on_connection_status_change.event

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.initialize_server()

    // Add subscription for cleanup
    context.subscriptions.push({
      dispose: () => this.dispose()
    })
  }

  private async is_port_in_use(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const tester = net
        .createServer()
        .once('error', () => {
          // Port is in use
          resolve(true)
        })
        .once('listening', () => {
          // Port is free
          tester.close()
          resolve(false)
        })
        .listen(port)
    })
  }

  private async initialize_server() {
    try {
      // Check if the port is already in use (server might be running)
      const port_in_use = await this.is_port_in_use(this.port)

      if (!port_in_use) {
        // Start server process
        this.start_server_process()
      }

      // Connect as a client
      this.connect_to_server()
    } catch (error) {
      console.error('Error initializing WebSocket server:', error)
      vscode.window.showErrorMessage(
        `Failed to initialize WebSocket server: ${error}`
      )
    }
  }

  private start_server_process() {
    // Get path to server script
    const server_script_path = path.join(
      this.context.extensionPath,
      'out',
      'websocket-server-process.js'
    )

    try {
      // Start server in child process
      const process = child_process.fork(server_script_path, [], {
        detached: true,
        stdio: 'ignore'
      })

      // Unref to allow the parent process to exit independently
      if (process.pid) {
        process.unref()
      }

      // Log process start
      console.log(`Started WebSocket server process with PID: ${process.pid}`)

      // Allow some time for the server to start up
      return new Promise<void>((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Failed to start WebSocket server process:', error)
      throw error
    }
  }

  private connect_to_server() {
    // Close existing connection if any
    if (this.client) {
      this.client.close()
      this.client = null
    }

    // Connect to the WebSocket server
    this.client = new WebSocket.WebSocket(
      `ws://localhost:${this.port}?token=${this.security_token}`
    )

    this.client.on('open', () => {
      console.log('Connected to WebSocket server')
      // Start ping interval to keep connection alive
      this.start_ping_interval()
    })

    this.client.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        if (message.action === 'browser-connection-status') {
          this._on_connection_status_change.fire(message.hasConnectedBrowsers)
        }
      } catch (error) {
        console.error('Error processing message:', error)
      }
    })

    this.client.on('error', (error) => {
      console.error('WebSocket client error:', error)
      this._on_connection_status_change.fire(false)

      // Schedule reconnect
      this.schedule_reconnect()
    })

    this.client.on('close', () => {
      console.log('Disconnected from WebSocket server')
      this._on_connection_status_change.fire(false)

      // Clear ping interval
      if (this.ping_interval) {
        clearInterval(this.ping_interval)
        this.ping_interval = null
      }

      // Schedule reconnect
      this.schedule_reconnect()
    })
  }

  private start_ping_interval() {
    // Clear existing interval
    if (this.ping_interval) {
      clearInterval(this.ping_interval)
    }

    // Send ping every 10 seconds to keep the connection alive
    this.ping_interval = setInterval(() => {
      if (this.client && this.client.readyState === WebSocket.OPEN) {
        this.client.send('ping')
      }
    }, 10000)
  }

  private schedule_reconnect() {
    // Clear existing reconnect timer
    if (this.reconnect_timer) {
      clearTimeout(this.reconnect_timer)
    }

    // Try to reconnect after 3 seconds
    this.reconnect_timer = setTimeout(() => {
      this.connect_to_server()
    }, 3000)
  }

  public async is_connected(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.port}/health`)
      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.connected_browsers > 0
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }

  public async initialize_chats(
    text: string,
    preset_names: string[]
  ): Promise<void> {
    if (!(await this.is_connected())) {
      throw new Error('Not connected to WebSocket server')
    }

    const config = vscode.workspace.getConfiguration()
    const open_in_background =
      config.get<boolean>('geminiCoder.webChatsInBackground') ?? false
    const web_chat_presets = config.get<any[]>('geminiCoder.presets') ?? []

    const message: InitializeChatsMessage = {
      action: 'initialize-chats',
      text,
      open_in_background,
      chats: preset_names
        .map((name) => {
          // Find preset by name
          const preset = web_chat_presets.find((p) => p.name == name)
          if (!preset) {
            return null
          }

          const chatbot = CHATBOTS[preset.chatbot]
          return {
            url: chatbot.url,
            model: preset.model,
            temperature: preset.temperature,
            system_instructions: preset.systemInstructions
          }
        })
        .filter((chat) => chat !== null) // Filter out any null chats
    }

    const verbose = config.get<boolean>('geminiCoder.verbose')
    if (verbose) {
      console.debug('Initialize chats message:', message)
    }

    this.client?.send(JSON.stringify(message))
  }

  public dispose() {
    // Clear intervals and timers
    if (this.ping_interval) {
      clearInterval(this.ping_interval)
      this.ping_interval = null
    }

    if (this.reconnect_timer) {
      clearTimeout(this.reconnect_timer)
      this.reconnect_timer = null
    }

    // Close WebSocket client
    if (this.client) {
      this.client.close()
      this.client = null
    }

    // Clean up event emitter
    this._on_connection_status_change.dispose()

    // We don't terminate the server process here, as we want it to continue
    // running independently of the VS Code extension
  }
}
