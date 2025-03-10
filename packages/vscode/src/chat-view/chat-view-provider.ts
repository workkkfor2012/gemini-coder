import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketManager } from '@/services/websocket-manager'
import { Presets } from '../../../ui/src/components/Presets'

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'geminiCoderViewChat'
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined

  constructor(
    private readonly _extension_uri: vscode.Uri,
    private readonly file_tree_provider: any,
    private readonly open_editors_provider: any,
    private readonly _context: vscode.ExtensionContext,
    private readonly websocket_server_instance: WebSocketManager
  ) {
    // Subscribe to connection status changes and forward to webview when available
    this.websocket_server_instance.on_connection_status_change((connected) => {
      if (this._webview_view) {
        this._webview_view.webview.postMessage({
          command: 'connectionStatus',
          connected
        })
      }
    })

    // Listen for configuration changes
    this._config_listener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (
          event.affectsConfiguration('geminiCoder.presets') &&
          this._webview_view
        ) {
          this._send_presets_to_webview(this._webview_view.webview)
        }
      }
    )

    // Register the disposable
    this._context.subscriptions.push(this._config_listener)
  }

  public async resolveWebviewView(
    webview_view: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._webview_view = webview_view

    webview_view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extension_uri]
    }

    webview_view.webview.html = this._get_html_for_webview(webview_view.webview)

    // Handle messages from the webview
    webview_view.webview.onDidReceiveMessage(async (message) => {
      if (message.command == 'getLastPrompt') {
        const last_instruction =
          this._context.globalState.get<string>('lastChatPrompt') || ''
        webview_view.webview.postMessage({
          command: 'initialPrompt',
          instruction: last_instruction
        })
      } else if (message.command == 'saveChatInstruction') {
        this._context.globalState.update('lastChatPrompt', message.instruction)
      } else if (message.command == 'getConnectionStatus') {
        // Send current connection status when requested by the webview
        webview_view.webview.postMessage({
          command: 'connectionStatus',
          connected: this.websocket_server_instance.is_connected_with_browser()
        })
      } else if (message.command == 'getPresets') {
        this._send_presets_to_webview(webview_view.webview)
      } else if (message.command == 'getSelectedPresets') {
        const selected_names = this._context.globalState.get<string[]>(
          'selectedPresets',
          []
        )
        webview_view.webview.postMessage({
          command: 'selectedPresets',
          names: selected_names
        })
      } else if (message.command == 'saveSelectedPresets') {
        this._context.globalState.update('selectedPresets', message.names)
      } else if (message.command == 'getExpandedPresets') {
        const expanded_indices = this._context.globalState.get<number[]>(
          'expandedPresets',
          []
        )
        webview_view.webview.postMessage({
          command: 'expandedPresets',
          indices: expanded_indices
        })
      } else if (message.command == 'saveExpandedPresets') {
        this._context.globalState.update('expandedPresets', message.indices)
      } else if (message.command == 'sendPrompt') {
        try {
          // Create files collector instance with both providers
          const files_collector = new FilesCollector(
            this.file_tree_provider,
            this.open_editors_provider
          )

          // Get the active text editor
          const active_editor = vscode.window.activeTextEditor
          const active_path = active_editor?.document.uri.fsPath

          // Collect files
          const context_text = await files_collector.collect_files({
            active_path
          })

          // Construct the final text
          let text = `${
            context_text ? `<files>\n${context_text}</files>\n` : ''
          }${message.instruction}`

          this.websocket_server_instance.initialize_chats(
            text,
            message.preset_names
          )
        } catch (error: any) {
          console.error('Error processing chat instruction:', error)
          vscode.window.showErrorMessage(
            'Error processing chat instruction: ' + error.message
          )
        }
      } else if (message.command == 'copyPrompt') {
        try {
          // Create files collector instance with both providers
          const files_collector = new FilesCollector(
            this.file_tree_provider,
            this.open_editors_provider
          )

          // Collect files
          const context_text = await files_collector.collect_files()

          // Construct the final text
          let text = `${
            context_text ? `<files>\n${context_text}</files>\n` : ''
          }${message.instruction}`

          vscode.env.clipboard.writeText(text)
        } catch (error: any) {
          console.error('Error processing chat instruction:', error)
          vscode.window.showErrorMessage(
            'Error processing chat instruction: ' + error.message
          )
        }
      } else if (message.command == 'showError') {
        vscode.window.showErrorMessage(message.message)
      } else if (message.command == 'showPresetPicker') {
        const config = vscode.workspace.getConfiguration()
        const web_chat_presets = config.get<any[]>('geminiCoder.presets', [])

        const preset_quick_pick_items = web_chat_presets.map((preset) => ({
          label: preset.name,
          description: `${preset.chatbot}${
            preset.model ? ` - ${preset.model}` : ''
          }`,
          picked: false
        }))

        // Get previously selected presets from globalState
        const selected_preset_names = this._context.globalState.get<string[]>(
          'selectedPresets',
          []
        )

        // Set picked state based on previously selected preset names
        preset_quick_pick_items.forEach((item) => {
          item.picked = selected_preset_names.includes(item.label)
        })

        vscode.window
          .showQuickPick(preset_quick_pick_items, {
            placeHolder: 'Select one or more chat presets',
            canPickMany: true
          })
          .then((selected_presets) => {
            if (selected_presets && selected_presets.length > 0) {
              const selected_names = selected_presets.map(
                (preset) => preset.label
              )

              // Save the selection
              this._context.globalState.update(
                'selectedPresets',
                selected_names
              )

              // Send the names back to the webview
              webview_view.webview.postMessage({
                command: 'presetsSelectedFromPicker',
                names: selected_names
              })
            } else {
              // Send empty array if nothing was selected
              webview_view.webview.postMessage({
                command: 'presetsSelectedFromPicker',
                names: []
              })
            }
          })
      } else if (message.command == 'openSettings') {
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'geminiCoder.presets'
        )
      }
    })

    // Send initial connection status after webview is ready
    webview_view.webview.postMessage({
      command: 'connectionStatus',
      connected: this.websocket_server_instance.is_connected_with_browser()
    })
  }

  // Helper method to send presets to webview
  private _send_presets_to_webview(webview: vscode.Webview) {
    const web_chat_presets_config = vscode.workspace
      .getConfiguration()
      .get('geminiCoder.presets', [])

    const presets: Presets.Preset[] = web_chat_presets_config.map(
      (preset: any) => ({
        name: preset.name,
        chatbot: preset.chatbot,
        prompt_prefix: preset.promptPrefix,
        prompt_suffix: preset.promptSuffix,
        model: preset.model,
        temperature: preset.temperature,
        system_instructions: preset.systemInstructions
      })
    )

    webview.postMessage({
      command: 'presets',
      presets
    })
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'out', 'chat.js')
    )

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
          <div id="root"></div>
          <script src="${script_uri}"></script>
      </body>
      </html>
    `
  }

  // Clean up resources when the provider is disposed
  public dispose() {
    if (this._config_listener) {
      this._config_listener.dispose()
    }
  }
}
