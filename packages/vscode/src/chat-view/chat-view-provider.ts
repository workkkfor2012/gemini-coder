import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketManager } from '@/services/websocket-manager'
import { Presets } from '../../../ui/src/components/Presets'
import { autocomplete_instruction_external } from '@/constants/instructions'

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'geminiCoderViewChat'
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  private _has_active_editor: boolean = false

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

    // Add window.onDidChangeActiveTextEditor listener
    const update_editor_state = () => {
      const has_active_editor = !!vscode.window.activeTextEditor
      if (has_active_editor !== this._has_active_editor) {
        this._has_active_editor = has_active_editor
        if (this._webview_view) {
          this._webview_view.webview.postMessage({
            command: 'editorStateChanged',
            hasActiveEditor: has_active_editor
          })
        }
      }
    }

    vscode.window.onDidChangeActiveTextEditor(() =>
      setTimeout(update_editor_state, 100)
    )
    update_editor_state() // Initial state
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
          this._context.workspaceState.get<string>('lastChatPrompt') || ''
        webview_view.webview.postMessage({
          command: 'initialPrompt',
          instruction: last_instruction
        })
      } else if (message.command == 'getLastFimPrompt') {
        const last_fim_instruction =
          this._context.workspaceState.get<string>('lastFimPrompt') || ''
        webview_view.webview.postMessage({
          command: 'initialFimPrompt',
          instruction: last_fim_instruction
        })
      } else if (message.command == 'saveChatInstruction') {
        this._context.workspaceState.update(
          'lastChatPrompt',
          message.instruction
        )
      } else if (message.command == 'saveFimInstruction') {
        this._context.workspaceState.update(
          'lastFimPrompt',
          message.instruction
        )
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
      } // In chat-view-provider.ts, inside the 'sendPrompt' message handler
      else if (message.command == 'sendPrompt') {
        try {
          const files_collector = new FilesCollector(
            this.file_tree_provider,
            this.open_editors_provider
          )

          // Get the active text editor
          const active_editor = vscode.window.activeTextEditor
          const active_path = active_editor?.document.uri.fsPath
          const is_fim_mode = this._context.globalState.get<boolean>(
            'isFimMode',
            false
          )

          if (is_fim_mode && active_editor) {
            // FIM mode structure
            const document = active_editor.document
            const position = active_editor.selection.active

            // Get text before and after cursor
            const text_before_cursor = document.getText(
              new vscode.Range(new vscode.Position(0, 0), position)
            )
            const text_after_cursor = document.getText(
              new vscode.Range(
                position,
                document.positionAt(document.getText().length)
              )
            )

            // Collect context files excluding current document
            const context_text = await files_collector.collect_files({
              exclude_path: active_path
            })

            // Construct FIM format text
            const text = `<files>${context_text}\n<file path="${vscode.workspace.asRelativePath(
              document.uri
            )}"><![CDATA[${text_before_cursor}<fill missing code>${text_after_cursor}]]></file>\n</files>\n${autocomplete_instruction_external} ${
              message.instruction
            }`

            this.websocket_server_instance.initialize_chats(
              text,
              message.preset_names
            )
          } else {
            // Regular chat mode (existing code)
            const context_text = await files_collector.collect_files({
              active_path
            })

            let text = `${
              context_text ? `<files>${context_text}</files>\n` : ''
            }${message.instruction}`

            this.websocket_server_instance.initialize_chats(
              text,
              message.preset_names
            )
          }
        } catch (error: any) {
          console.error('Error processing chat instruction:', error)
          vscode.window.showErrorMessage(
            'Error processing chat instruction: ' + error.message
          )
        }
      } else if (message.command == 'copyPrompt') {
        try {
          const files_collector = new FilesCollector(
            this.file_tree_provider,
            this.open_editors_provider
          )

          // Get current FIM mode state and active editor
          const is_fim_mode = this._context.globalState.get<boolean>(
            'isFimMode',
            false
          )
          const active_editor = vscode.window.activeTextEditor

          if (is_fim_mode && active_editor) {
            // FIM mode copying logic
            const document = active_editor.document
            const position = active_editor.selection.active
            const active_path = document.uri.fsPath

            // Get text before and after cursor
            const text_before_cursor = document.getText(
              new vscode.Range(new vscode.Position(0, 0), position)
            )
            const text_after_cursor = document.getText(
              new vscode.Range(
                position,
                document.positionAt(document.getText().length)
              )
            )

            // Collect context files excluding current document
            const context_text = await files_collector.collect_files({
              exclude_path: active_path
            })

            // Construct FIM format text
            const text = `<files>${context_text}\n<file path="${vscode.workspace.asRelativePath(
              document.uri
            )}"><![CDATA[${text_before_cursor}<fill missing code>${text_after_cursor}]]></file>\n</files>\n${autocomplete_instruction_external} ${
              message.instruction
            }`

            vscode.env.clipboard.writeText(text)
          } else {
            // Regular chat mode copying (existing logic)
            const context_text = await files_collector.collect_files()
            let text = `${context_text ? `\n${context_text}\n` : ''}${
              message.instruction
            }`
            vscode.env.clipboard.writeText(text)
          }

          // Show success message
          vscode.window.showInformationMessage('Prompt copied to clipboard!')
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
      } else if (message.command == 'getFimMode') {
        const is_fim_mode = this._context.workspaceState.get<boolean>(
          'isFimMode',
          false
        )
        const has_active_editor = !!vscode.window.activeTextEditor
        // Exit fim mode if no editor is active
        if (is_fim_mode && !has_active_editor) {
          this._context.workspaceState.update('isFimMode', false)
          webview_view.webview.postMessage({
            command: 'fimMode',
            enabled: false
          })
        } else {
          webview_view.webview.postMessage({
            command: 'fimMode',
            enabled: is_fim_mode
          })
        }
      } else if (message.command == 'saveFimMode') {
        this._context.workspaceState.update('isFimMode', message.enabled)
      } else if (message.command == 'requestEditorState') {
        webview_view.webview.postMessage({
          command: 'editorStateChanged',
          hasActiveEditor: this._has_active_editor
        })
      }
    })

    // Send initial connection status after webview is ready
    webview_view.webview.postMessage({
      command: 'connectionStatus',
      connected: this.websocket_server_instance.is_connected_with_browser()
    })
    // Send initial editor state after webview is ready
    webview_view.webview.postMessage({
      command: 'editorStateChanged',
      hasActiveEditor: this._has_active_editor
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
