import * as vscode from 'vscode'
import { FilesCollector } from '../../helpers/files-collector'
import { WebSocketManager } from '@/services/websocket-manager'
import {
  WebviewMessage,
  ExtensionMessage,
  PresetsMessage,
  TokenCountMessage,
  SelectionTextMessage,
  ActiveFileInfoMessage,
  UpdatePresetMessage,
  DeletePresetMessage,
  SelectedPresetsMessage,
  DuplicatePresetMessage,
  CreatePresetMessage,
  GeminiApiKeyMessage,
  CustomProvidersUpdatedMessage,
  OpenRouterModelsMessage,
  OpenRouterModelSelectedMessage,
  ApiToolCodeCompletionsSettingsMessage,
  ApiToolFileRefactoringSettingsMessage,
  ApiToolCommitMessageSettingsMessage,
  OpenRouterApiKeyMessage,
  ExecuteCommandMessage,
  ShowQuickPickMessage,
  PreviewPresetMessage,
  SelectedCodeCompletionPresetsMessage,
  InstructionsMessage,
  CodeCompletionSuggestionsMessage,
  EditFormatSelectorVisibilityMessage
} from '../types/messages'
import { WebsitesProvider } from '../../context/providers/websites-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors-provider'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { token_count_emitter } from '@/context/context-initialization'
import { Preset } from '@shared/types/preset'
import { ApiToolsSettingsManager } from '@/services/api-tools-settings-manager'
import { ToolSettings } from '@shared/types/tool-settings'
import { EditFormat } from '@shared/types/edit-format'
import { EditFormatSelectorVisibility } from '../types/edit-format-selector-visibility'
import {
  handle_GET_API_TOOL_CODE_COMPLETIONS_SETTINGS,
  handle_GET_API_TOOL_FILE_REFACTORING_SETTINGS,
  handle_get_open_router_models,
  handle_show_open_router_model_picker,
  handle_show_preset_picker,
  handle_copy_prompt,
  handle_send_prompt,
  handle_update_preset,
  handle_delete_preset,
  handle_duplicate_preset,
  handle_create_preset,
  handle_preview_preset // Added this import
} from './message-handlers'
import {
  config_preset_to_ui_format,
  ui_preset_to_config_format,
  ConfigPresetFormat
} from '@/view/backend/helpers/preset-format-converters'

export class ViewProvider implements vscode.WebviewViewProvider {
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  public has_active_editor: boolean = false
  public has_active_selection: boolean = false
  public is_code_completions_mode: boolean = false
  public api_tools_settings_manager: ApiToolsSettingsManager
  public caret_position: number = 0
  public instructions: string = ''
  public code_completion_suggestions: string = ''
  public edit_format: EditFormat

  constructor(
    public readonly extension_uri: vscode.Uri,
    public readonly workspace_provider: WorkspaceProvider,
    public readonly open_editors_provider: OpenEditorsProvider,
    public readonly websites_provider: WebsitesProvider,
    public readonly context: vscode.ExtensionContext,
    public readonly websocket_server_instance: WebSocketManager
  ) {
    this.websocket_server_instance.on_connection_status_change((connected) => {
      if (this._webview_view) {
        this.send_message<ExtensionMessage>({
          command: 'CONNECTION_STATUS',
          connected
        })
      }
    })

    // Initialize edit format from workspace state
    this.edit_format = this.context.workspaceState.get<EditFormat>(
      'editFormat',
      'truncated'
    )

    // Listen for changes to the new configuration keys
    this._config_listener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (
          event.affectsConfiguration('codeWebChat.presets') &&
          this._webview_view
        ) {
          this.send_presets_to_webview(this._webview_view.webview)
        } else if (
          event.affectsConfiguration('codeWebChat.providers') &&
          this._webview_view
        ) {
          const config = vscode.workspace.getConfiguration('codeWebChat')
          const providers = config.get<any[]>('providers', [])
          this.send_message<CustomProvidersUpdatedMessage>({
            command: 'CUSTOM_PROVIDERS_UPDATED',
            custom_providers: providers
          })
        } else if (
          event.affectsConfiguration(
            'codeWebChat.apiToolCodeCompletionsSettings'
          ) &&
          this._webview_view
        ) {
          handle_GET_API_TOOL_CODE_COMPLETIONS_SETTINGS(this)
        } else if (
          event.affectsConfiguration(
            'codeWebChat.apiToolFileRefactoringSettings'
          ) &&
          this._webview_view
        ) {
          handle_GET_API_TOOL_FILE_REFACTORING_SETTINGS(this)
        } else if (
          event.affectsConfiguration(
            'codeWebChat.apiToolCommitMessageSettings'
          ) &&
          this._webview_view
        ) {
          const config = vscode.workspace.getConfiguration('codeWebChat')
          const settings = config.get<ToolSettings>(
            'apiToolCommitMessageSettings',
            {}
          )
          this.send_message<ApiToolCommitMessageSettingsMessage>({
            command: 'API_TOOL_COMMIT_MESSAGES_SETTINGS',
            settings
          })
        } else if (
          event.affectsConfiguration(
            'codeWebChat.editFormatSelectorVisibility'
          ) &&
          this._webview_view
        ) {
          const config = vscode.workspace.getConfiguration('codeWebChat')
          const visibility = config.get<EditFormatSelectorVisibility>(
            'editFormatSelectorVisibility'
          )!
          this.send_message<EditFormatSelectorVisibilityMessage>({
            command: 'EDIT_FORMAT_SELECTOR_VISIBILITY',
            visibility
          })
        }
      }
    )

    token_count_emitter.on('token-count-updated', () => {
      if (this._webview_view) {
        this._calculate_token_count()
      }
    })

    this.context.subscriptions.push(this._config_listener)
    this.api_tools_settings_manager = new ApiToolsSettingsManager(this.context)

    this.instructions = this.context.workspaceState.get<string>(
      'instructions',
      ''
    )
    this.code_completion_suggestions = this.context.workspaceState.get<string>(
      'code-completion-suggestions',
      ''
    )

    const update_editor_state = () => {
      const has_active_editor = !!vscode.window.activeTextEditor
      if (has_active_editor != this.has_active_editor) {
        this.has_active_editor = has_active_editor
        if (this._webview_view) {
          this.send_message<ExtensionMessage>({
            command: 'EDITOR_STATE_CHANGED',
            has_active_editor: has_active_editor
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
      if (has_selection != this.has_active_selection) {
        this.has_active_selection = has_selection
        if (this._webview_view) {
          this.send_message<ExtensionMessage>({
            command: 'EDITOR_SELECTION_CHANGED',
            has_selection: has_selection
          })
        }
      }
      if (has_selection && this.is_code_completions_mode) {
        this.is_code_completions_mode = false
        if (this._webview_view) {
          this.send_message<ExtensionMessage>({
            command: 'CODE_COMPLETIONS_MODE',
            enabled: false
          })
        }
      }
    })

    const update_selection_state = () => {
      const active_text_editor = vscode.window.activeTextEditor
      const has_selection = active_text_editor
        ? !active_text_editor.selection.isEmpty
        : false
      this.has_active_selection = has_selection
      if (this._webview_view) {
        this.send_message<ExtensionMessage>({
          command: 'EDITOR_SELECTION_CHANGED',
          has_selection: has_selection
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
          this.send_message<SelectionTextMessage>({
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
        if (this.is_code_completions_mode && this._webview_view) {
          this._calculate_token_count()
        }
      }
    })
  }

  private _calculate_token_count() {
    const files_collector = new FilesCollector(
      this.workspace_provider,
      this.open_editors_provider,
      this.websites_provider
    )

    const active_editor = vscode.window.activeTextEditor
    const active_path = active_editor?.document.uri.fsPath

    const options = {
      disable_xml: true,
      ...(this.is_code_completions_mode && active_path
        ? { exclude_path: active_path }
        : {})
    }

    files_collector
      .collect_files(options)
      .then((context_text) => {
        let current_token_count = Math.floor(context_text.length / 4)

        if (active_editor && this.is_code_completions_mode) {
          const document = active_editor.document
          const text = document.getText()
          const file_token_count = Math.floor(text.length / 4)
          current_token_count += file_token_count
        }

        this.send_message<TokenCountMessage>({
          command: 'TOKEN_COUNT_UPDATED',
          tokenCount: current_token_count
        })
      })
      .catch((error) => {
        console.error('Error calculating token count:', error)
        this.send_message<TokenCountMessage>({
          command: 'TOKEN_COUNT_UPDATED',
          tokenCount: 0
        })
      })
  }

  public send_message<
    T extends
      | ExtensionMessage
      | PresetsMessage
      | TokenCountMessage
      | SelectionTextMessage
      | ActiveFileInfoMessage
      | UpdatePresetMessage
      | DeletePresetMessage
      | SelectedPresetsMessage
      | SelectedCodeCompletionPresetsMessage
      | DuplicatePresetMessage
      | CreatePresetMessage
      | GeminiApiKeyMessage
      | CustomProvidersUpdatedMessage
      | OpenRouterModelsMessage
      | OpenRouterModelSelectedMessage
      | ApiToolCodeCompletionsSettingsMessage
      | ApiToolFileRefactoringSettingsMessage
      | ApiToolCommitMessageSettingsMessage
      | ExecuteCommandMessage
      | ShowQuickPickMessage
      | PreviewPresetMessage
      | InstructionsMessage
      | CodeCompletionSuggestionsMessage
      | EditFormatSelectorVisibilityMessage
  >(message: T) {
    if (this._webview_view) {
      this._webview_view.webview.postMessage(message)
    }
  }

  async resolveWebviewView(
    webview_view: vscode.WebviewView,
    _: vscode.WebviewViewResolveContext,
    __: vscode.CancellationToken
  ) {
    this._webview_view = webview_view

    webview_view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extension_uri]
    }

    webview_view.webview.html = this._get_html_for_webview(webview_view.webview)

    webview_view.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        try {
          if (message.command == 'GET_HISTORY') {
            const history = this.context.workspaceState.get<string[]>(
              'history',
              []
            )
            this.send_message<ExtensionMessage>({
              command: 'CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'GET_CODE_COMPLETIONS_HISTORY') {
            const history = this.context.workspaceState.get<string[]>(
              'code-completions-history',
              []
            )
            this.send_message<ExtensionMessage>({
              command: 'FIM_CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'SAVE_HISTORY') {
            const key = !this.is_code_completions_mode
              ? 'history'
              : 'code-completions-history'
            this.context.workspaceState.update(key, message.messages)
          } else if (message.command == 'GET_INSTRUCTIONS') {
            this.send_message<InstructionsMessage>({
              command: 'INSTRUCTIONS',
              value: this.instructions
            })
          } else if (message.command == 'SAVE_INSTRUCTIONS') {
            this.instructions = message.instruction
            this.context.workspaceState.update(
              'instructions',
              message.instruction
            )
          } else if (message.command == 'GET_CODE_COMPLETION_SUGGESTIONS') {
            this.send_message<CodeCompletionSuggestionsMessage>({
              command: 'CODE_COMPLETION_SUGGESTIONS',
              value: this.code_completion_suggestions
            })
          } else if (message.command == 'SAVE_CODE_COMPLETION_SUGGESTIONS') {
            this.code_completion_suggestions = message.instruction
            this.context.workspaceState.update(
              'code-completion-suggestions',
              message.instruction
            )
          } else if (message.command == 'GET_CONNECTION_STATUS') {
            this.send_message<ExtensionMessage>({
              command: 'CONNECTION_STATUS',
              connected:
                this.websocket_server_instance.is_connected_with_browser()
            })
          } else if (message.command == 'GET_PRESETS') {
            this.send_presets_to_webview(webview_view.webview)
          } else if (message.command == 'GET_SELECTED_PRESETS') {
            const selected_names = this.context.globalState.get<string[]>(
              'selectedPresets',
              []
            )
            this.send_message<SelectedPresetsMessage>({
              command: 'SELECTED_PRESETS',
              names: selected_names
            })
          } else if (message.command == 'SAVE_SELECTED_PRESETS') {
            await this.context.globalState.update(
              'selectedPresets',
              message.names
            )
          } else if (
            message.command == 'GET_SELECTED_CODE_COMPLETION_PRESETS'
          ) {
            const selected_names = this.context.globalState.get<string[]>(
              'selectedCodeCompletionPresets',
              []
            )
            this.send_message<SelectedCodeCompletionPresetsMessage>({
              command: 'SELECTED_CODE_COMPLETION_PRESETS',
              names: selected_names
            })
          } else if (
            message.command == 'SAVE_SELECTED_CODE_COMPLETION_PRESETS'
          ) {
            await this.context.globalState.update(
              'selectedCodeCompletionPresets',
              message.names
            )
          } else if (message.command == 'SEND_PROMPT') {
            await handle_send_prompt(this, message.preset_names)
          } else if (message.command == 'PREVIEW_PRESET') {
            await handle_preview_preset(this, message)
          } else if (message.command == 'COPY_PROMPT') {
            await handle_copy_prompt(this)
          } else if (message.command == 'SHOW_PRESET_PICKER') {
            await handle_show_preset_picker(this, this.is_code_completions_mode)
          } else if (message.command == 'GET_CODE_COMPLETIONS_MODE') {
            const has_active_editor = !!vscode.window.activeTextEditor

            if (this.is_code_completions_mode && !has_active_editor) {
              this.is_code_completions_mode = false
              this.send_message<ExtensionMessage>({
                command: 'CODE_COMPLETIONS_MODE',
                enabled: false
              })
            } else {
              this.send_message<ExtensionMessage>({
                command: 'CODE_COMPLETIONS_MODE',
                enabled: this.is_code_completions_mode
              })
            }
          } else if (message.command == 'SAVE_CODE_COMPLETIONS_MODE') {
            this.is_code_completions_mode = message.enabled
            this._calculate_token_count()
            this.send_message<ExtensionMessage>({
              command: 'CODE_COMPLETIONS_MODE',
              enabled: message.enabled
            })
          } else if (message.command == 'REQUEST_EDITOR_STATE') {
            this.send_message<ExtensionMessage>({
              command: 'EDITOR_STATE_CHANGED',
              has_active_editor: this.has_active_editor
            })
          } else if (message.command == 'REQUEST_EDITOR_SELECTION_STATE') {
            this.send_message<ExtensionMessage>({
              command: 'EDITOR_SELECTION_CHANGED',
              has_selection: this.has_active_selection
            })
          } else if (message.command == 'GET_CURRENT_TOKEN_COUNT') {
            this._calculate_token_count()
          } else if (message.command == 'SAVE_PRESETS_ORDER') {
            const config = vscode.workspace.getConfiguration('codeWebChat')
            // Convert UI format from message to config format before saving
            const config_formatted_presets = message.presets.map((preset) =>
              ui_preset_to_config_format(preset)
            )
            await config.update(
              'presets',
              config_formatted_presets,
              vscode.ConfigurationTarget.Global
            )
          } else if (message.command == 'UPDATE_PRESET') {
            await handle_update_preset(this, message, webview_view)
          } else if (message.command == 'DELETE_PRESET') {
            await handle_delete_preset(this, message, webview_view)
          } else if (message.command == 'DUPLICATE_PRESET') {
            await handle_duplicate_preset(this, message, webview_view)
          } else if (message.command == 'CREATE_PRESET') {
            await handle_create_preset(this) // Call the new handler
          } else if (message.command == 'GET_GEMINI_API_KEY') {
            const api_key = this.api_tools_settings_manager.get_gemini_api_key()
            this.send_message<GeminiApiKeyMessage>({
              command: 'GEMINI_API_KEY',
              api_key
            })
          } else if (message.command == 'GET_OPEN_ROUTER_API_KEY') {
            const api_key =
              this.api_tools_settings_manager.get_open_router_api_key()
            this.send_message<OpenRouterApiKeyMessage>({
              command: 'OPEN_ROUTER_API_KEY',
              api_key
            })
          } else if (message.command == 'UPDATE_GEMINI_API_KEY') {
            await this.api_tools_settings_manager.set_gemini_api_key(
              message.api_key
            )
          } else if (message.command == 'UPDATE_OPEN_ROUTER_API_KEY') {
            await this.api_tools_settings_manager.set_open_router_api_key(
              message.api_key
            )
          } else if (message.command == 'GET_OPEN_ROUTER_MODELS') {
            await handle_get_open_router_models(this)
          } else if (message.command == 'SHOW_OPEN_ROUTER_MODEL_PICKER') {
            await handle_show_open_router_model_picker(this, message.models)
          } else if (
            message.command == 'GET_API_TOOL_CODE_COMPLETIONS_SETTINGS'
          ) {
            handle_GET_API_TOOL_CODE_COMPLETIONS_SETTINGS(this)
          } else if (
            message.command == 'UPDATE_TOOL_CODE_COMPLETIONS_SETTINGS'
          ) {
            this.api_tools_settings_manager.set_code_completions_settings(
              message.settings
            )
          } else if (
            message.command == 'GET_API_TOOL_FILE_REFACTORING_SETTINGS'
          ) {
            handle_GET_API_TOOL_FILE_REFACTORING_SETTINGS(this)
          } else if (
            message.command == 'UPDATE_TOOL_FILE_REFACTORING_SETTINGS'
          ) {
            this.api_tools_settings_manager.set_file_refactoring_settings(
              message.settings
            )
          } else if (
            message.command == 'GET_API_TOOL_COMMIT_MESSAGES_SETTINGS'
          ) {
            const settings =
              this.api_tools_settings_manager.GET_API_TOOL_COMMIT_MESSAGES_SETTINGS()
            this.send_message<ApiToolCommitMessageSettingsMessage>({
              command: 'API_TOOL_COMMIT_MESSAGES_SETTINGS',
              settings
            })
          } else if (
            message.command == 'UPDATE_TOOL_COMMIT_MESSAGES_SETTINGS'
          ) {
            this.api_tools_settings_manager.set_commit_messages_settings(
              message.settings
            )
          } else if (message.command == 'EXECUTE_COMMAND') {
            vscode.commands.executeCommand(message.command_id)
          } else if (message.command == 'SHOW_QUICK_PICK') {
            const items = message.items.map((item) => ({
              label: item.label,
              description: item.description
            }))

            const selected_item = await vscode.window.showQuickPick(items, {
              placeHolder: message.title
            })

            if (selected_item) {
              const selected_command = message.items.find(
                (item) => item.label == selected_item.label
              )?.command

              if (selected_command) {
                vscode.commands.executeCommand(selected_command)
              }
            }
          } else if (message.command == 'GET_EDIT_FORMAT') {
            this.send_message({
              command: 'EDIT_FORMAT',
              edit_format: this.edit_format
            })
          } else if (message.command == 'SAVE_EDIT_FORMAT') {
            this.edit_format = message.edit_format
            await this.context.workspaceState.update(
              'editFormat',
              message.edit_format
            )
          } else if (message.command == 'GET_EDIT_FORMAT_SELECTOR_VISIBILITY') {
            const config = vscode.workspace.getConfiguration('codeWebChat')
            const visibility = config.get<EditFormatSelectorVisibility>(
              'editFormatSelectorVisibility'
            )!
            this.send_message<EditFormatSelectorVisibilityMessage>({
              command: 'EDIT_FORMAT_SELECTOR_VISIBILITY',
              visibility
            })
          } else if (
            message.command == 'SAVE_EDIT_FORMAT_SELECTOR_VISIBILITY'
          ) {
            const config = vscode.workspace.getConfiguration('codeWebChat')
            await config.update(
              'editFormatSelectorVisibility',
              message.visibility,
              vscode.ConfigurationTarget.Global
            )
          } else if (message.command == 'CARET_POSITION_CHANGED') {
            this.caret_position = message.caret_position
          }
        } catch (error: any) {
          console.error('Error handling message:', message, error)
          vscode.window.showErrorMessage(
            `Error handling message: ${error.message}`
          )
        }
      }
    )

    // Added initial message for edit format selector visibility
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const initial_visibility = config.get<'visible' | 'hidden'>(
      'editFormatSelectorVisibility',
      'visible'
    )
    this.send_message<EditFormatSelectorVisibilityMessage>({
      command: 'EDIT_FORMAT_SELECTOR_VISIBILITY',
      visibility: initial_visibility
    })

    this._update_active_file_info()
    this.send_presets_to_webview(webview_view.webview)
    this._send_custom_providers()
  }

  // Add this method to the ChatViewProvider class
  private _update_active_file_info() {
    if (!this._webview_view) return

    const active_editor = vscode.window.activeTextEditor
    if (active_editor) {
      const document = active_editor.document
      const text_length = document.getText().length

      this.send_message<ActiveFileInfoMessage>({
        command: 'ACTIVE_FILE_INFO_UPDATED',
        fileLength: text_length
      })
    }
  }

  public send_presets_to_webview(_: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_chat_presets_config =
      config.get<ConfigPresetFormat[]>('presets', []) || []

    // Convert from config format to UI format before sending
    const presets_for_ui: Preset[] = web_chat_presets_config.map(
      (preset_config) => config_preset_to_ui_format(preset_config)
    )

    this.send_message<PresetsMessage>({
      command: 'PRESETS',
      presets: presets_for_ui
    })
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    const resources_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extension_uri, 'resources')
    )

    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extension_uri, 'out', 'view.js')
    )

    const style_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extension_uri, 'out', 'view.css')
    )

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${style_uri}">
        <script>
          window.resources_uri = "${resources_uri}";
        </script>
        <style>
          body {
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script src="${script_uri}"></script>
      </body>
      </html>
    `
  }

  private _send_custom_providers() {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const providers = config.get<any[]>('providers', [])
    this.send_message<CustomProvidersUpdatedMessage>({
      command: 'CUSTOM_PROVIDERS_UPDATED',
      custom_providers: providers
    })
  }

  public add_text_at_cursor_position(text: string) {
    if (this.is_code_completions_mode) {
      // Insert text at caret position for code completions
      const before_caret = this.code_completion_suggestions.slice(
        0,
        this.caret_position
      )
      const after_caret = this.code_completion_suggestions.slice(
        this.caret_position
      )
      this.code_completion_suggestions = before_caret + text + after_caret

      // Update caret position to be after the inserted text
      this.caret_position += text.length

      this.context.workspaceState.update(
        'code-completion-suggestions',
        this.code_completion_suggestions
      )
      this.send_message<CodeCompletionSuggestionsMessage>({
        command: 'CODE_COMPLETION_SUGGESTIONS',
        value: this.code_completion_suggestions
      })
    } else {
      // Insert text at caret position for instructions
      const before_caret = this.instructions.slice(0, this.caret_position)
      const after_caret = this.instructions.slice(this.caret_position)
      this.instructions = before_caret + text + after_caret

      // Update caret position to be after the inserted text
      this.caret_position += text.length

      this.context.workspaceState.update('instructions', this.instructions)
      this.send_message<InstructionsMessage>({
        command: 'INSTRUCTIONS',
        value: this.instructions
      })
    }
  }
}
