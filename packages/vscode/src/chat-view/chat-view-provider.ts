import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketServer } from '@/services/websocket-server'
import { Presets } from '../../../ui/src/components/Presets'

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'geminiCoderViewChat'
  private _webview_view: vscode.WebviewView | undefined

  constructor(
    private readonly _extension_uri: vscode.Uri,
    private readonly file_tree_provider: any,
    private readonly _context: vscode.ExtensionContext,
    private readonly websocket_server_instance: WebSocketServer
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
  }

  public resolveWebviewView(
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
          connected: this.websocket_server_instance.is_connected()
        })
      } else if (message.command == 'getWebChatPresets') {
        const web_chat_presets_config = vscode.workspace
          .getConfiguration()
          .get('geminiCoder.webChatPresets', [])
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
        webview_view.webview.postMessage({
          command: 'webChatPresets',
          presets
        })
      } else if (message.command == 'getSelectedPresets') {
        const selected_indices = this._context.globalState.get<number[]>(
          'selectedWebChatPresets',
          []
        )
        webview_view.webview.postMessage({
          command: 'selectedPresets',
          indices: selected_indices
        })
      } else if (message.command == 'saveSelectedPresets') {
        this._context.globalState.update(
          'selectedWebChatPresets',
          message.indices
        )
      } else if (message.command == 'sendPrompt') {
        try {
          // Create files collector instance
          const files_collector = new FilesCollector(this.file_tree_provider)
          let context = ''

          // Collect files
          context = await files_collector.collect_files()

          // Construct the final text
          let text = `${context ? `${context}\n` : ''}${message.instruction}`

          this.websocket_server_instance.initialize_chats(
            text,
            message.preset_indices
          )
        } catch (error: any) {
          console.error('Error processing chat instruction:', error)
          vscode.window.showErrorMessage(
            'Error processing chat instruction: ' + error.message
          )
        }
      } else if (message.command == 'copyPrompt') {
        try {
          // Create files collector instance
          const files_collector = new FilesCollector(this.file_tree_provider)
          let context = ''

          // Collect files
          context = await files_collector.collect_files()

          // Construct the final text
          let text = `${context ? `${context}\n` : ''}${message.instruction}`

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
        const web_chat_presets = config.get<any[]>(
          'geminiCoder.webChatPresets',
          []
        )

        const preset_quick_pick_items = web_chat_presets.map(
          (preset, index) => ({
            label: preset.name,
            description: `${preset.chatbot}${
              preset.model ? ` - ${preset.model}` : ''
            }`,
            picked: false,
            index: index
          })
        )

        vscode.window
          .showQuickPick(preset_quick_pick_items, {
            placeHolder: 'Select one or more chat presets',
            canPickMany: true
          })
          .then((selected_presets) => {
            if (selected_presets && selected_presets.length > 0) {
              const selected_indices = selected_presets.map(
                (preset) => preset.index
              )

              // Save the selection
              this._context.globalState.update(
                'selectedWebChatPresets',
                selected_indices
              )

              // Send the indices back to the webview
              webview_view.webview.postMessage({
                command: 'presetsSelectedFromPicker',
                indices: selected_indices
              })
            } else {
              // Send empty array if nothing was selected
              webview_view.webview.postMessage({
                command: 'presetsSelectedFromPicker',
                indices: []
              })
            }
          })
      }
    })

    // Send initial connection status after webview is ready
    webview_view.webview.postMessage({
      command: 'connectionStatus',
      connected: this.websocket_server_instance.is_connected()
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
}
