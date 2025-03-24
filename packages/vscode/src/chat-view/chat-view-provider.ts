import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketManager } from '@/services/websocket-manager'
import { Presets } from '../../../ui/src/components/Presets'
import { autocomplete_instruction_external } from '@/constants/instructions'
import {
  WebviewMessage,
  ExtensionMessage,
  PresetsMessage,
  TokenCountMessage,
  SelectionTextMessage,
  ActiveFileInfoMessage
} from './types/messages'
import { WebsitesProvider } from '../context/websites-provider'
import { OpenEditorsProvider } from '@/context/open-editors-provider'
import { WorkspaceProvider } from '@/context/workspace-provider'
import { apply_preset_affixes_to_instruction } from '../helpers/apply-preset-affixes'
import { token_count_emitter } from '@/context/context-initialization'

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  private _has_active_editor: boolean = false
  private _has_active_selection: boolean = false

  constructor(
    private readonly _extension_uri: vscode.Uri,
    private readonly _workspace_provider: WorkspaceProvider,
    private readonly _open_editors_provider: OpenEditorsProvider,
    private readonly _websites_provider: WebsitesProvider,
    private readonly _context: vscode.ExtensionContext,
    private readonly websocket_server_instance: WebSocketManager
  ) {
    this.websocket_server_instance.on_connection_status_change((connected) => {
      if (this._webview_view) {
        this._send_message<ExtensionMessage>({
          command: 'CONNECTION_STATUS',
          connected
        })
      }
    })

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

    token_count_emitter.on('token-count-updated', () => {
      if (this._webview_view) {
        this._calculate_token_count()
      }
    })

    this._context.subscriptions.push(this._config_listener)

    const update_editor_state = () => {
      const has_active_editor = !!vscode.window.activeTextEditor
      if (has_active_editor !== this._has_active_editor) {
        this._has_active_editor = has_active_editor
        if (this._webview_view) {
          this._send_message<ExtensionMessage>({
            command: 'EDITOR_STATE_CHANGED',
            hasActiveEditor: has_active_editor
          })
        }
      }
    }

    vscode.window.onDidChangeActiveTextEditor(() =>
      setTimeout(update_editor_state, 100)
    )
    update_editor_state()

    // Add selection change listener
    vscode.window.onDidChangeTextEditorSelection((event) => {
      const has_selection = !event.textEditor.selection.isEmpty
      if (has_selection != this._has_active_selection) {
        this._has_active_selection = has_selection
        if (this._webview_view) {
          this._send_message<ExtensionMessage>({
            command: 'EDITOR_SELECTION_CHANGED',
            hasSelection: has_selection
          })
        }
      }
    })

    const update_selection_state = () => {
      const active_text_editor = vscode.window.activeTextEditor
      const has_selection = active_text_editor
        ? !active_text_editor.selection.isEmpty
        : false
      this._has_active_selection = has_selection
      if (this._webview_view) {
        this._send_message<ExtensionMessage>({
          command: 'EDITOR_SELECTION_CHANGED',
          hasSelection: has_selection
        })
      }
    }

    const update_selection_text = () => {
      const active_text_editor = vscode.window.activeTextEditor
      if (active_text_editor && !active_text_editor.selection.isEmpty) {
        const selected_text = active_text_editor.document.getText(
          active_text_editor.selection
        )

        if (this._webview_view) {
          this._send_message<SelectionTextMessage>({
            command: 'SELECTION_TEXT_UPDATED',
            text: selected_text
          })
        }
      }
    }

    vscode.window.onDidChangeActiveTextEditor(() =>
      setTimeout(update_selection_state, 100)
    )
    update_selection_state()

    vscode.window.onDidChangeTextEditorSelection(() =>
      setTimeout(update_selection_text, 100)
    )
    update_selection_text()

    vscode.window.onDidChangeActiveTextEditor(() => {
      this._update_active_file_info()
    })

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        vscode.window.activeTextEditor &&
        event.document === vscode.window.activeTextEditor.document
      ) {
        this._update_active_file_info()

        // Also recalculate token count when active file changes in FIM mode
        const is_fim_mode = this._context.workspaceState.get<boolean>(
          'isFimMode',
          false
        )
        if (is_fim_mode && this._webview_view) {
          this._calculate_token_count()
        }
      }
    })
  }

  private _calculate_token_count() {
    const files_collector = new FilesCollector(
      this._workspace_provider,
      this._open_editors_provider,
      this._websites_provider
    )

    const is_fim_mode = this._context.workspaceState.get<boolean>(
      'isFimMode',
      false
    )
    const active_editor = vscode.window.activeTextEditor
    const active_path = active_editor?.document.uri.fsPath

    const options = {
      disable_xml: true,
      ...(is_fim_mode && active_path ? { exclude_path: active_path } : {})
    }

    files_collector
      .collect_files(options)
      .then((context_text) => {
        let current_token_count = Math.floor(context_text.length / 4)

        if (active_editor && is_fim_mode) {
          const document = active_editor.document
          const text = document.getText()
          const file_token_count = Math.floor(text.length / 4)
          current_token_count += file_token_count
        }

        this._send_message<TokenCountMessage>({
          command: 'TOKEN_COUNT_UPDATED',
          tokenCount: current_token_count
        })
      })
      .catch((error) => {
        console.error('Error calculating token count:', error)
        this._send_message<TokenCountMessage>({
          command: 'TOKEN_COUNT_UPDATED',
          tokenCount: 0
        })
      })
  }

  private _send_message<
    T extends
      | ExtensionMessage
      | PresetsMessage
      | TokenCountMessage
      | SelectionTextMessage
      | ActiveFileInfoMessage
  >(message: T) {
    if (this._webview_view) {
      this._webview_view.webview.postMessage(message)
    }
  }

  // Helper method to replace @selection with selected text
  private _replace_selection_placeholder(instruction: string): string {
    if (!instruction.includes('@selection')) {
      return instruction
    }

    const active_editor = vscode.window.activeTextEditor
    if (!active_editor || active_editor.selection.isEmpty) {
      // If no selection, just return the original instruction
      vscode.window.showInformationMessage(
        'No text selected for @selection placeholder.'
      )
      return instruction.replace(/@selection/g, '')
    }

    const selected_text = active_editor.document.getText(
      active_editor.selection
    )

    // Check if the selected text is a single line
    const is_single_line = !selected_text.includes('\n')

    if (is_single_line) {
      // For single-line text, wrap with single backticks
      return instruction.replace(/@selection/g, `\`${selected_text}\``)
    } else {
      // For multi-line text, wrap with triple backticks as before
      return instruction.replace(
        /@selection/g,
        `\n\`\`\`\n${selected_text}\n\`\`\`\n`
      )
    }
  }

  async resolveWebviewView(
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

    webview_view.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        try {
          if (message.command == 'GET_CHAT_HISTORY') {
            const history = this._context.workspaceState.get<string[]>(
              'chat-history',
              []
            )
            this._send_message<ExtensionMessage>({
              command: 'CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'GET_FIM_CHAT_HISTORY') {
            const history = this._context.workspaceState.get<string[]>(
              'fim-chat-history',
              []
            )
            this._send_message<ExtensionMessage>({
              command: 'FIM_CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'SAVE_CHAT_HISTORY') {
            const key = message.is_fim_mode
              ? 'fim-chat-history'
              : 'chat-history'
            await this._context.workspaceState.update(key, message.messages)
          } else if (message.command == 'GET_LAST_PROMPT') {
            const last_instruction =
              this._context.workspaceState.get<string>('lastChatPrompt') || ''
            this._send_message<ExtensionMessage>({
              command: 'INITIAL_PROMPT',
              instruction: last_instruction
            })
          } else if (message.command == 'GET_LAST_FIM_PROMPT') {
            const last_fim_instruction =
              this._context.workspaceState.get<string>('lastFimPrompt') || ''
            this._send_message<ExtensionMessage>({
              command: 'INITIAL_FIM_PROMPT',
              instruction: last_fim_instruction
            })
          } else if (message.command == 'SAVE_CHAT_INSTRUCTION') {
            await this._context.workspaceState.update(
              'lastChatPrompt',
              message.instruction
            )
          } else if (message.command == 'SAVE_FIM_INSTRUCTION') {
            await this._context.workspaceState.update(
              'lastFimPrompt',
              message.instruction
            )
          } else if (message.command == 'GET_CONNECTION_STATUS') {
            this._send_message<ExtensionMessage>({
              command: 'CONNECTION_STATUS',
              connected:
                this.websocket_server_instance.is_connected_with_browser()
            })
          } else if (message.command == 'GET_PRESETS') {
            this._send_presets_to_webview(webview_view.webview)
          } else if (message.command == 'GET_SELECTED_PRESETS') {
            const selected_names = this._context.globalState.get<string[]>(
              'selectedPresets',
              []
            )
            this._send_message<ExtensionMessage>({
              command: 'SELECTED_PRESETS',
              names: selected_names
            })
          } else if (message.command == 'SAVE_SELECTED_PRESETS') {
            await this._context.globalState.update(
              'selectedPresets',
              message.names
            )
          } else if (message.command == 'GET_EXPANDED_PRESETS') {
            const expanded_indices = this._context.globalState.get<number[]>(
              'expandedPresets',
              []
            )
            this._send_message<ExtensionMessage>({
              command: 'EXPANDED_PRESETS',
              indices: expanded_indices
            })
          } else if (message.command == 'SAVE_EXPANDED_PRESETS') {
            await this._context.globalState.update(
              'expandedPresets',
              message.indices
            )
          } else if (message.command == 'SEND_PROMPT') {
            const files_collector = new FilesCollector(
              this._workspace_provider,
              this._open_editors_provider,
              this._websites_provider
            )

            const active_editor = vscode.window.activeTextEditor
            const active_path = active_editor?.document.uri.fsPath
            const is_fim_mode = this._context.workspaceState.get<boolean>(
              'isFimMode',
              false
            )

            if (is_fim_mode && active_editor) {
              const document = active_editor.document
              const position = active_editor.selection.active

              const text_before_cursor = document.getText(
                new vscode.Range(new vscode.Position(0, 0), position)
              )
              const text_after_cursor = document.getText(
                new vscode.Range(
                  position,
                  document.positionAt(document.getText().length)
                )
              )

              const context_text = await files_collector.collect_files({
                exclude_path: active_path
              })

              // relative path
              const workspace_folder =
                vscode.workspace.workspaceFolders?.[0].uri.fsPath
              const relative_path = active_path!.replace(
                workspace_folder + '/',
                ''
              )

              const text = `<files>\n${context_text}<file name="${relative_path}">\n<![CDATA[\n${text_before_cursor}<fill missing code>${text_after_cursor}\n]]>\n</file>\n</files>\n${autocomplete_instruction_external}${
                message.instruction
                  ? ` Follow suggestions: ${message.instruction}`
                  : ''
              }`

              this.websocket_server_instance.initialize_chats(
                text,
                message.preset_names
              )
            } else if (!is_fim_mode) {
              const context_text = await files_collector.collect_files({
                active_path
              })

              // Replace @selection with selected text if present
              const instruction = this._replace_selection_placeholder(
                message.instruction
              )

              // Apply prefixes and suffixes to the instruction
              const modified_instruction = apply_preset_affixes_to_instruction(
                instruction,
                message.preset_names
              )

              const text = `${
                context_text ? `<files>\n${context_text}</files>\n` : ''
              }${modified_instruction}`

              this.websocket_server_instance.initialize_chats(
                text,
                message.preset_names
              )
            }
          } else if (message.command == 'COPY_PROMPT') {
            const files_collector = new FilesCollector(
              this._workspace_provider,
              this._open_editors_provider,
              this._websites_provider
            )

            const is_fim_mode = this._context.workspaceState.get<boolean>(
              'isFimMode',
              false
            )
            const active_editor = vscode.window.activeTextEditor

            if (is_fim_mode && active_editor) {
              const document = active_editor.document
              const position = active_editor.selection.active
              const active_path = document.uri.fsPath

              const text_before_cursor = document.getText(
                new vscode.Range(new vscode.Position(0, 0), position)
              )
              const text_after_cursor = document.getText(
                new vscode.Range(
                  position,
                  document.positionAt(document.getText().length)
                )
              )

              const context_text = await files_collector.collect_files({
                exclude_path: active_path
              })

              // relative path
              const workspace_folder =
                vscode.workspace.workspaceFolders?.[0].uri.fsPath
              const relative_path = active_path.replace(
                workspace_folder + '/',
                ''
              )

              const text = `<files>\n${context_text}<file name="${relative_path}"><![CDATA[${text_before_cursor}<fill missing code>${text_after_cursor}]]>\n</file>\n</files>\n${autocomplete_instruction_external}${
                message.instruction
                  ? ` Follow suggestions: ${message.instruction}`
                  : ''
              }`

              await vscode.env.clipboard.writeText(text)
            } else if (!is_fim_mode) {
              const active_path = active_editor?.document.uri.fsPath
              const context_text = await files_collector.collect_files({
                active_path
              })

              // Replace @selection with selected text if present
              const instruction = this._replace_selection_placeholder(
                message.instruction
              )

              const text = `${
                context_text ? `<files>\n${context_text}</files>\n` : ''
              }${instruction}`
              await vscode.env.clipboard.writeText(text)
            }

            vscode.window.showInformationMessage('Prompt copied to clipboard!')
          } else if (message.command == 'SHOW_ERROR') {
            vscode.window.showErrorMessage(message.message)
          } else if (message.command == 'SHOW_PRESET_PICKER') {
            const config = vscode.workspace.getConfiguration()
            const web_chat_presets = config.get<any[]>(
              'geminiCoder.presets',
              []
            )

            const preset_quick_pick_items = web_chat_presets.map((preset) => ({
              label: preset.name,
              description: `${preset.chatbot}${
                preset.model ? ` - ${preset.model}` : ''
              }`,
              picked: false
            }))

            const selected_preset_names = this._context.globalState.get<
              string[]
            >('selectedPresets', [])

            preset_quick_pick_items.forEach((item) => {
              item.picked = selected_preset_names.includes(item.label)
            })

            const selected_presets = await vscode.window.showQuickPick(
              preset_quick_pick_items,
              {
                placeHolder: 'Select one or more chat presets',
                canPickMany: true
              }
            )

            if (selected_presets && selected_presets.length > 0) {
              const selected_names = selected_presets.map(
                (preset) => preset.label
              )

              await this._context.globalState.update(
                'selectedPresets',
                selected_names
              )

              this._send_message<ExtensionMessage>({
                command: 'PRESETS_SELECTED_FROM_PICKER',
                names: selected_names
              })
            } else {
              this._send_message<ExtensionMessage>({
                command: 'PRESETS_SELECTED_FROM_PICKER',
                names: []
              })
            }
          } else if (message.command == 'OPEN_SETTINGS') {
            await vscode.commands.executeCommand(
              'workbench.action.openSettings',
              'geminiCoder.presets'
            )
          } else if (message.command == 'GET_FIM_MODE') {
            const is_fim_mode = this._context.workspaceState.get<boolean>(
              'isFimMode',
              false
            )
            const has_active_editor = !!vscode.window.activeTextEditor

            if (is_fim_mode && !has_active_editor) {
              await this._context.workspaceState.update('isFimMode', false)
              this._send_message<ExtensionMessage>({
                command: 'FIM_MODE',
                enabled: false
              })
            } else {
              this._send_message<ExtensionMessage>({
                command: 'FIM_MODE',
                enabled: is_fim_mode
              })
            }
          } else if (message.command == 'SAVE_FIM_MODE') {
            await this._context.workspaceState.update(
              'isFimMode',
              message.enabled
            )
            this._calculate_token_count()
          } else if (message.command == 'REQUEST_EDITOR_STATE') {
            this._send_message<ExtensionMessage>({
              command: 'EDITOR_STATE_CHANGED',
              hasActiveEditor: this._has_active_editor
            })
          } else if (message.command == 'REQUEST_EDITOR_SELECTION_STATE') {
            this._send_message<ExtensionMessage>({
              command: 'EDITOR_SELECTION_CHANGED',
              hasSelection: this._has_active_selection
            })
          } else if (message.command == 'GET_CURRENT_TOKEN_COUNT') {
            this._calculate_token_count()
          }
        } catch (error: any) {
          console.error('Error handling message:', message, error)
          vscode.window.showErrorMessage(
            `Error handling message: ${error.message}`
          )
        }
      }
    )

    // Send initial states
    this._send_message<ExtensionMessage>({
      command: 'CONNECTION_STATUS',
      connected: this.websocket_server_instance.is_connected_with_browser()
    })

    this._send_message<ExtensionMessage>({
      command: 'EDITOR_STATE_CHANGED',
      hasActiveEditor: this._has_active_editor
    })
    this._send_message<ExtensionMessage>({
      command: 'EDITOR_SELECTION_CHANGED',
      hasSelection: this._has_active_selection
    })

    // Send initial file info
    this._update_active_file_info()
  }

  // Add this method to the ChatViewProvider class
  private _update_active_file_info() {
    if (!this._webview_view) return

    const active_editor = vscode.window.activeTextEditor
    if (active_editor) {
      const document = active_editor.document
      const text_length = document.getText().length

      this._send_message<ActiveFileInfoMessage>({
        command: 'ACTIVE_FILE_INFO_UPDATED',
        fileLength: text_length
      })
    }
  }

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
        system_instructions: preset.systemInstructions,
        options: preset.options
      })
    )

    const message_presets = presets.map((preset) => ({
      name: preset.name,
      chatbot: String(preset.chatbot),
      prompt_prefix: preset.prompt_prefix,
      prompt_suffix: preset.prompt_suffix,
      model: preset.model,
      temperature: preset.temperature,
      system_instructions: preset.system_instructions,
      options: preset.options
    }))

    this._send_message<PresetsMessage>({
      command: 'PRESETS',
      presets: message_presets
    })
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    const resources_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'resources')
    )

    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'out', 'chat.js')
    )

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script>
          window.resources_uri = "${resources_uri}";
        </script>
      </head>
      <body>
          <div id="root"></div>
          <script src="${script_uri}"></script>
      </body>
      </html>
    `
  }

  public dispose() {
    if (this._config_listener) {
      this._config_listener.dispose()
    }
  }
}
