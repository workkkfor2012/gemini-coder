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
import { CHATBOTS } from '@shared/constants/chatbots'
import { ApiToolsSettingsManager } from '@/services/api-tools-settings-manager'
import { ToolSettings } from '@shared/types/tool-settings'
import { replace_selection_placeholder } from '../../utils/replace-selection-placeholder'
import { EditFormat } from '@shared/types/edit-format'
import { EditFormatSelectorVisibility } from '../types/edit-format-selector-visibility'
import {
  handle_GET_API_TOOL_CODE_COMPLETIONS_SETTINGS,
  handle_GET_API_TOOL_FILE_REFACTORING_SETTINGS,
  handle_get_open_router_models,
  handle_show_open_router_model_picker,
  handle_show_preset_picker,
  handle_copy_prompt,
  handle_send_prompt
} from './message-handlers'

export type ConfigPresetFormat = {
  name: string
  chatbot: keyof typeof CHATBOTS
  promptPrefix?: string
  promptSuffix?: string
  model?: string
  temperature?: number
  topP?: number
  systemInstructions?: string
  options?: string[]
  port?: number
}

export class ViewProvider implements vscode.WebviewViewProvider {
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  private _has_active_editor: boolean = false
  private _has_active_selection: boolean = false
  private _is_code_completions_mode: boolean = false
  private _api_tools_settings_manager: ApiToolsSettingsManager
  private _caret_position: number = 0
  private _instructions: string = ''
  private _code_completion_suggestions: string = ''
  private _edit_format: EditFormat

  constructor(
    private readonly _extension_uri: vscode.Uri,
    private readonly _workspace_provider: WorkspaceProvider,
    private readonly _open_editors_provider: OpenEditorsProvider,
    private readonly _websites_provider: WebsitesProvider,
    private readonly _context: vscode.ExtensionContext,
    private readonly _websocket_server_instance: WebSocketManager
  ) {
    this._websocket_server_instance.on_connection_status_change((connected) => {
      if (this._webview_view) {
        this.send_message<ExtensionMessage>({
          command: 'CONNECTION_STATUS',
          connected
        })
      }
    })

    // Initialize edit format from workspace state
    this._edit_format = this._context.workspaceState.get<EditFormat>(
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
          this._send_presets_to_webview(this._webview_view.webview)
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

    this._context.subscriptions.push(this._config_listener)
    this._api_tools_settings_manager = new ApiToolsSettingsManager(
      this._context
    )

    this._instructions = this._context.workspaceState.get<string>(
      'instructions',
      ''
    )
    this._code_completion_suggestions =
      this._context.workspaceState.get<string>(
        'code-completion-suggestions',
        ''
      )

    const update_editor_state = () => {
      const has_active_editor = !!vscode.window.activeTextEditor
      if (has_active_editor != this._has_active_editor) {
        this._has_active_editor = has_active_editor
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
      if (has_selection != this._has_active_selection) {
        this._has_active_selection = has_selection
        if (this._webview_view) {
          this.send_message<ExtensionMessage>({
            command: 'EDITOR_SELECTION_CHANGED',
            has_selection: has_selection
          })
        }
      }
      if (has_selection && this._is_code_completions_mode) {
        this._is_code_completions_mode = false
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
      this._has_active_selection = has_selection
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
        if (this._is_code_completions_mode && this._webview_view) {
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

    const active_editor = vscode.window.activeTextEditor
    const active_path = active_editor?.document.uri.fsPath

    const options = {
      disable_xml: true,
      ...(this._is_code_completions_mode && active_path
        ? { exclude_path: active_path }
        : {})
    }

    files_collector
      .collect_files(options)
      .then((context_text) => {
        let current_token_count = Math.floor(context_text.length / 4)

        if (active_editor && this._is_code_completions_mode) {
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

  // Helper function to convert UI Preset format to Config format
  private _ui_preset_to_config_format(preset: Preset): ConfigPresetFormat {
    return {
      name: preset.name,
      chatbot: preset.chatbot,
      promptPrefix: preset.prompt_prefix,
      promptSuffix: preset.prompt_suffix,
      model: preset.model,
      temperature: preset.temperature,
      topP: preset.top_p,
      systemInstructions: preset.system_instructions,
      options: preset.options,
      port: preset.port
    }
  }

  // Helper function to convert Config Preset format to UI format (already used in _send_presets_to_webview)
  private _config_preset_to_ui_format(
    config_preset: ConfigPresetFormat
  ): Preset {
    return {
      name: config_preset.name,
      chatbot: config_preset.chatbot,
      prompt_prefix: config_preset.promptPrefix,
      prompt_suffix: config_preset.promptSuffix,
      model: config_preset.model,
      temperature: config_preset.temperature,
      top_p: config_preset.topP,
      system_instructions: config_preset.systemInstructions,
      options: config_preset.options,
      port: config_preset.port
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
      localResourceRoots: [this._extension_uri]
    }

    webview_view.webview.html = this._get_html_for_webview(webview_view.webview)

    webview_view.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        try {
          if (message.command == 'GET_HISTORY') {
            const history = this._context.workspaceState.get<string[]>(
              'history',
              []
            )
            this.send_message<ExtensionMessage>({
              command: 'CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'GET_CODE_COMPLETIONS_HISTORY') {
            const history = this._context.workspaceState.get<string[]>(
              'code-completions-history',
              []
            )
            this.send_message<ExtensionMessage>({
              command: 'FIM_CHAT_HISTORY',
              messages: history
            })
          } else if (message.command == 'SAVE_HISTORY') {
            const key = !this._is_code_completions_mode
              ? 'history'
              : 'code-completions-history'
            this._context.workspaceState.update(key, message.messages)
          } else if (message.command == 'GET_INSTRUCTIONS') {
            this.send_message<InstructionsMessage>({
              command: 'INSTRUCTIONS',
              value: this._instructions
            })
          } else if (message.command == 'SAVE_INSTRUCTIONS') {
            this._instructions = message.instruction
            this._context.workspaceState.update(
              'instructions',
              message.instruction
            )
          } else if (message.command == 'GET_CODE_COMPLETION_SUGGESTIONS') {
            this.send_message<CodeCompletionSuggestionsMessage>({
              command: 'CODE_COMPLETION_SUGGESTIONS',
              value: this._code_completion_suggestions
            })
          } else if (message.command == 'SAVE_CODE_COMPLETION_SUGGESTIONS') {
            this._code_completion_suggestions = message.instruction
            this._context.workspaceState.update(
              'code-completion-suggestions',
              message.instruction
            )
          } else if (message.command == 'GET_CONNECTION_STATUS') {
            this.send_message<ExtensionMessage>({
              command: 'CONNECTION_STATUS',
              connected:
                this._websocket_server_instance.is_connected_with_browser()
            })
          } else if (message.command == 'GET_PRESETS') {
            this._send_presets_to_webview(webview_view.webview)
          } else if (message.command == 'GET_SELECTED_PRESETS') {
            const selected_names = this._context.globalState.get<string[]>(
              'selectedPresets',
              []
            )
            this.send_message<SelectedPresetsMessage>({
              command: 'SELECTED_PRESETS',
              names: selected_names
            })
          } else if (message.command == 'SAVE_SELECTED_PRESETS') {
            await this._context.globalState.update(
              'selectedPresets',
              message.names
            )
          } else if (
            message.command == 'GET_SELECTED_CODE_COMPLETION_PRESETS'
          ) {
            const selected_names = this._context.globalState.get<string[]>(
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
            await this._context.globalState.update(
              'selectedCodeCompletionPresets',
              message.names
            )
          } else if (message.command == 'SEND_PROMPT') {
            await handle_send_prompt(this, message.preset_names)
          } else if (message.command == 'PREVIEW_PRESET') {
            await vscode.workspace.saveAll()

            const files_collector = new FilesCollector(
              this._workspace_provider,
              this._open_editors_provider,
              this._websites_provider
            )

            const active_editor = vscode.window.activeTextEditor
            const active_path = active_editor?.document.uri.fsPath

            let text_to_send: string
            const current_instructions = !this._is_code_completions_mode
              ? this._instructions
              : this._code_completion_suggestions

            if (this._is_code_completions_mode && active_editor) {
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

              const workspace_folder =
                vscode.workspace.workspaceFolders?.[0].uri.fsPath
              const relative_path = active_path!.replace(
                workspace_folder + '/',
                ''
              )

              const config = vscode.workspace.getConfiguration('codeWebChat')
              const chat_code_completion_instructions = config.get<string>(
                'chatCodeCompletionInstructions'
              )

              const instructions = `${chat_code_completion_instructions}${
                current_instructions
                  ? ` Follow suggestions: ${current_instructions}`
                  : ''
              }`

              text_to_send = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`
            } else if (!this._is_code_completions_mode) {
              const context_text = await files_collector.collect_files({
                active_path
              })

              let instructions =
                replace_selection_placeholder(current_instructions)

              // Apply affixes from the PREVIEW preset, not default selected ones
              if (message.preset.prompt_prefix) {
                instructions =
                  message.preset.prompt_prefix + '\n' + instructions
              }
              if (message.preset.prompt_suffix) {
                instructions =
                  instructions + '\n' + message.preset.prompt_suffix
              }

              // Use the stored _edit_format property
              const config = vscode.workspace.getConfiguration('codeWebChat')
              const edit_format_instructions = config.get<string>(
                `codeWebChat.editFormatInstructions${
                  this._edit_format.charAt(0).toUpperCase() +
                  this._edit_format.slice(1)
                }`
              )
              if (edit_format_instructions) {
                instructions += `\n${edit_format_instructions}`
              }

              text_to_send = `${
                context_text
                  ? `${instructions}\n<files>\n${context_text}</files>\n`
                  : ''
              }${instructions}`
            } else {
              vscode.window.showWarningMessage(
                'Cannot preview in code completion mode without an active editor.'
              )
              return
            }

            this._websocket_server_instance.preview_preset(
              text_to_send,
              message.preset
            )
            vscode.window.showInformationMessage(
              'Preset preview sent to the connected browser.'
            )
          } else if (message.command == 'COPY_PROMPT') {
            await handle_copy_prompt(this)
          } else if (message.command == 'SHOW_PRESET_PICKER') {
            await handle_show_preset_picker(
              this,
              this._is_code_completions_mode
            )
          } else if (message.command == 'GET_CODE_COMPLETIONS_MODE') {
            const has_active_editor = !!vscode.window.activeTextEditor

            if (this._is_code_completions_mode && !has_active_editor) {
              this._is_code_completions_mode = false
              this.send_message<ExtensionMessage>({
                command: 'CODE_COMPLETIONS_MODE',
                enabled: false
              })
            } else {
              this.send_message<ExtensionMessage>({
                command: 'CODE_COMPLETIONS_MODE',
                enabled: this._is_code_completions_mode
              })
            }
          } else if (message.command == 'SAVE_CODE_COMPLETIONS_MODE') {
            this._is_code_completions_mode = message.enabled
            this._calculate_token_count()
            this.send_message<ExtensionMessage>({
              command: 'CODE_COMPLETIONS_MODE',
              enabled: message.enabled
            })
          } else if (message.command == 'REQUEST_EDITOR_STATE') {
            this.send_message<ExtensionMessage>({
              command: 'EDITOR_STATE_CHANGED',
              has_active_editor: this._has_active_editor
            })
          } else if (message.command == 'REQUEST_EDITOR_SELECTION_STATE') {
            this.send_message<ExtensionMessage>({
              command: 'EDITOR_SELECTION_CHANGED',
              has_selection: this._has_active_selection
            })
          } else if (message.command == 'GET_CURRENT_TOKEN_COUNT') {
            this._calculate_token_count()
          } else if (message.command == 'SAVE_PRESETS_ORDER') {
            const config = vscode.workspace.getConfiguration('codeWebChat')
            // Convert UI format from message to config format before saving
            const config_formatted_presets = message.presets.map((preset) =>
              this._ui_preset_to_config_format(preset)
            )
            await config.update(
              'presets',
              config_formatted_presets,
              vscode.ConfigurationTarget.Global
            )
          } else if (message.command == 'UPDATE_PRESET') {
            const config = vscode.workspace.getConfiguration('codeWebChat')
            const current_presets =
              config.get<ConfigPresetFormat[]>('presets', []) || []

            const preset_index = current_presets.findIndex(
              (p) => p.name == message.updating_preset.name
            )

            if (preset_index != -1) {
              const are_presets_equal = (a: Preset, b: Preset): boolean => {
                return (
                  a.name == b.name &&
                  a.chatbot == b.chatbot &&
                  a.prompt_prefix == b.prompt_prefix &&
                  a.prompt_suffix == b.prompt_suffix &&
                  a.model == b.model &&
                  a.temperature === b.temperature && // can be undefined and 0
                  a.top_p === b.top_p && // same
                  a.system_instructions == b.system_instructions &&
                  JSON.stringify(a.options) == JSON.stringify(b.options) &&
                  a.port == b.port
                )
              }

              const has_changes = !are_presets_equal(
                message.updating_preset,
                message.updated_preset
              )

              if (!has_changes) {
                this.send_message<ExtensionMessage>({
                  command: 'PRESET_UPDATED'
                })
                return
              }

              const save_changes_button = 'Save'
              const discard_changes = 'Discard Changes'
              const result = await vscode.window.showInformationMessage(
                'Save changes to the preset?',
                {
                  modal: true,
                  detail:
                    "If you don't save, updates to the preset will be lost."
                },
                save_changes_button,
                discard_changes
              )

              if (result == discard_changes) {
                this.send_message<ExtensionMessage>({
                  command: 'PRESET_UPDATED'
                })
                return
              }

              if (result != save_changes_button) {
                return
              }

              const updated_ui_preset = { ...message.updated_preset }
              let final_name = updated_ui_preset.name.trim()

              // --- Start uniqueness check ---
              let is_unique = false
              let copy_number = 0
              const base_name = final_name

              while (!is_unique) {
                const name_to_check =
                  copy_number == 0
                    ? base_name
                    : `${base_name} (${copy_number})`.trim()

                // Check if this name exists in *other* presets
                const conflict = current_presets.some(
                  (p, index) => index != preset_index && p.name == name_to_check
                )

                if (!conflict) {
                  final_name = name_to_check
                  is_unique = true
                } else {
                  copy_number++
                }
              }
              // --- End uniqueness check ---

              // If the name had to be changed, update the preset object
              if (final_name != updated_ui_preset.name) {
                updated_ui_preset.name = final_name
              }

              const updated_presets = [...current_presets]
              // Convert the updated preset (with potentially modified name) from UI format to config format
              updated_presets[preset_index] =
                this._ui_preset_to_config_format(updated_ui_preset)

              await config.update(
                'presets',
                updated_presets,
                vscode.ConfigurationTarget.Global
              )

              // Update selected (default) presets for both modes
              const selected_chat_names = this._context.globalState.get<
                string[]
              >('selectedPresets', [])
              if (selected_chat_names.includes(message.updating_preset.name)) {
                const updated_selected_names = selected_chat_names.map((name) =>
                  name == message.updating_preset.name ? final_name : name
                )
                await this._context.globalState.update(
                  'selectedPresets',
                  updated_selected_names
                )
                // Send updated selected presets to webview
                this.send_message<SelectedPresetsMessage>({
                  command: 'SELECTED_PRESETS',
                  names: updated_selected_names
                })
              }

              // Handle selected code completion presets
              const selected_fim_names = this._context.globalState.get<
                string[]
              >('selectedCodeCompletionPresets', [])
              const was_in_selected_fim = selected_fim_names.includes(
                message.updating_preset.name
              )

              if (was_in_selected_fim) {
                // Check if preset now has prefix or suffix (making it ineligible for FIM)
                const has_affixes =
                  updated_ui_preset.prompt_prefix ||
                  updated_ui_preset.prompt_suffix

                if (has_affixes) {
                  // Remove from selected FIM presets
                  const updated_selected_fim = selected_fim_names.filter(
                    (name) => name !== message.updating_preset.name
                  )
                  await this._context.globalState.update(
                    'selectedCodeCompletionPresets',
                    updated_selected_fim
                  )
                  this.send_message<SelectedCodeCompletionPresetsMessage>({
                    command: 'SELECTED_CODE_COMPLETION_PRESETS',
                    names: updated_selected_fim
                  })
                } else if (final_name != message.updating_preset.name) {
                  // Just update the name if it changed but still no affixes
                  const updated_selected_fim = selected_fim_names.map((name) =>
                    name == message.updating_preset.name ? final_name : name
                  )
                  await this._context.globalState.update(
                    'selectedCodeCompletionPresets',
                    updated_selected_fim
                  )
                  this.send_message<SelectedCodeCompletionPresetsMessage>({
                    command: 'SELECTED_CODE_COMPLETION_PRESETS',
                    names: updated_selected_fim
                  })
                }
              }

              this._send_presets_to_webview(webview_view.webview)
              this.send_message<ExtensionMessage>({
                command: 'PRESET_UPDATED'
              })
            } else {
              console.error(
                `Preset with original name "${message.updating_preset.name}" not found.`
              )
              vscode.window.showErrorMessage(
                `Could not update preset: Original preset "${message.updating_preset.name}" not found.`
              )
            }
          } else if (message.command == 'DELETE_PRESET') {
            const preset_name = message.name
            const config = vscode.workspace.getConfiguration('codeWebChat')
            const current_presets =
              config.get<ConfigPresetFormat[]>('presets', []) || []

            // Show confirmation dialog with revert option
            const delete_button = 'Delete'
            const result = await vscode.window.showInformationMessage(
              'Please confirm',
              {
                modal: true,
                detail: `Are you sure you want to delete preset "${preset_name}"?`
              },
              delete_button
            )

            if (result != delete_button) {
              return // User cancelled
            }

            // Store the deleted preset and its index in case we need to revert
            const preset_index = current_presets.findIndex(
              (p) => p.name == preset_name
            )
            const deleted_preset = current_presets[preset_index]
            const updated_presets = current_presets.filter(
              (p) => p.name != preset_name
            )

            try {
              await config.update(
                'presets',
                updated_presets,
                vscode.ConfigurationTarget.Global
              )

              // Show notification with undo option
              const button_text = 'Undo'
              const undo_result = await vscode.window.showInformationMessage(
                `Preset "${preset_name}" has been deleted.`,
                button_text
              )

              if (undo_result == button_text && deleted_preset) {
                // Restore the preset at its original position
                const restored_presets = [...updated_presets]
                restored_presets.splice(preset_index, 0, deleted_preset)

                await config.update(
                  'presets',
                  restored_presets,
                  vscode.ConfigurationTarget.Global
                )
                vscode.window.showInformationMessage(
                  `Preset "${preset_name}" restored.`
                )
              }

              // Send updated list back to webview
              this._send_presets_to_webview(webview_view.webview)

              // Also update selected presets for both modes if needed
              const selected_chat_names = this._context.globalState.get<
                string[]
              >('selectedPresets', [])
              if (selected_chat_names.includes(preset_name)) {
                const updated_selected = selected_chat_names.filter(
                  (n) => n != preset_name
                )
                await this._context.globalState.update(
                  'selectedPresets',
                  updated_selected
                )
                this.send_message<SelectedPresetsMessage>({
                  command: 'SELECTED_PRESETS',
                  names: updated_selected
                })
              }

              const selected_fim_names = this._context.globalState.get<
                string[]
              >('selectedCodeCompletionPresets', [])
              if (selected_fim_names.includes(preset_name)) {
                const updated_selected = selected_fim_names.filter(
                  (n) => n != preset_name
                )
                await this._context.globalState.update(
                  'selectedCodeCompletionPresets',
                  updated_selected
                )
                this.send_message<SelectedCodeCompletionPresetsMessage>({
                  command: 'SELECTED_CODE_COMPLETION_PRESETS',
                  names: updated_selected
                })
              }
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to delete preset: ${error}`
              )
            }
          } else if (message.command == 'DUPLICATE_PRESET') {
            const preset_name = message.name
            const config = vscode.workspace.getConfiguration('codeWebChat')
            const current_presets =
              config.get<ConfigPresetFormat[]>('presets', []) || []

            const preset_to_duplicate = current_presets.find(
              (p) => p.name == preset_name
            )
            if (!preset_to_duplicate) {
              vscode.window.showErrorMessage(
                `Preset "${preset_name}" not found`
              )
              return
            }

            // Find the index of the original preset
            const original_index = current_presets.findIndex(
              (p) => p.name == preset_name
            )

            // Generate unique name
            let new_name = `${preset_name} (1)`
            let copy_number = 1
            while (current_presets.some((p) => p.name == new_name)) {
              new_name = `${preset_name} (${copy_number++})`
            }

            // Create duplicate with new name
            const duplicated_preset = {
              ...preset_to_duplicate,
              name: new_name
            }

            // Add to presets right after the original
            const updated_presets = [...current_presets]
            updated_presets.splice(original_index + 1, 0, duplicated_preset)

            try {
              await config.update('presets', updated_presets, true)
              this._send_presets_to_webview(webview_view.webview)
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to duplicate preset: ${error}`
              )
            }
          } else if (message.command == 'CREATE_PRESET') {
            // Get current presets
            const config = vscode.workspace.getConfiguration('codeWebChat')
            const current_presets =
              config.get<ConfigPresetFormat[]>('presets', []) || []

            // Generate unique name
            let new_name = ''
            let copy_number = 0
            while (current_presets.some((p) => p.name == new_name)) {
              new_name = `(${copy_number++})`
            }

            const new_preset: ConfigPresetFormat = {
              name: new_name,
              chatbot: 'AI Studio',
              model: Object.keys(CHATBOTS['AI Studio'].models)[0],
              temperature: 0.5,
              systemInstructions:
                CHATBOTS['AI Studio'].default_system_instructions
            }

            const updated_presets = [...current_presets, new_preset]

            try {
              this.send_message<ExtensionMessage>({
                command: 'PRESET_CREATED',
                preset: this._config_preset_to_ui_format(new_preset)
              })
              config.update('presets', updated_presets, true)
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to create preset: ${error}`
              )
            }
          } else if (message.command == 'GET_GEMINI_API_KEY') {
            const api_key =
              this._api_tools_settings_manager.get_gemini_api_key()
            this.send_message<GeminiApiKeyMessage>({
              command: 'GEMINI_API_KEY',
              api_key
            })
          } else if (message.command == 'GET_OPEN_ROUTER_API_KEY') {
            const api_key =
              this._api_tools_settings_manager.get_open_router_api_key()
            this.send_message<OpenRouterApiKeyMessage>({
              command: 'OPEN_ROUTER_API_KEY',
              api_key
            })
          } else if (message.command == 'UPDATE_GEMINI_API_KEY') {
            await this._api_tools_settings_manager.set_gemini_api_key(
              message.api_key
            )
          } else if (message.command == 'UPDATE_OPEN_ROUTER_API_KEY') {
            await this._api_tools_settings_manager.set_open_router_api_key(
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
            this._api_tools_settings_manager.set_code_completions_settings(
              message.settings
            )
          } else if (
            message.command == 'GET_API_TOOL_FILE_REFACTORING_SETTINGS'
          ) {
            handle_GET_API_TOOL_FILE_REFACTORING_SETTINGS(this)
          } else if (
            message.command == 'UPDATE_TOOL_FILE_REFACTORING_SETTINGS'
          ) {
            this._api_tools_settings_manager.set_file_refactoring_settings(
              message.settings
            )
          } else if (
            message.command == 'GET_API_TOOL_COMMIT_MESSAGES_SETTINGS'
          ) {
            const settings =
              this._api_tools_settings_manager.GET_API_TOOL_COMMIT_MESSAGES_SETTINGS()
            this.send_message<ApiToolCommitMessageSettingsMessage>({
              command: 'API_TOOL_COMMIT_MESSAGES_SETTINGS',
              settings
            })
          } else if (
            message.command == 'UPDATE_TOOL_COMMIT_MESSAGES_SETTINGS'
          ) {
            this._api_tools_settings_manager.set_commit_messages_settings(
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
              edit_format: this._edit_format
            })
          } else if (message.command == 'SAVE_EDIT_FORMAT') {
            this._edit_format = message.edit_format
            await this._context.workspaceState.update(
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
            this._caret_position = message.caret_position
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
    this._send_presets_to_webview(webview_view.webview)
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

  private _send_presets_to_webview(_: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_chat_presets_config =
      config.get<ConfigPresetFormat[]>('presets', []) || []

    // Convert from config format to UI format before sending
    const presets_for_ui: Preset[] = web_chat_presets_config.map(
      (preset_config) => this._config_preset_to_ui_format(preset_config)
    )

    this.send_message<PresetsMessage>({
      command: 'PRESETS',
      presets: presets_for_ui
    })
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    const resources_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'resources')
    )

    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'out', 'view.js')
    )

    const style_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'out', 'view.css')
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
    if (this._is_code_completions_mode) {
      // Insert text at caret position for code completions
      const before_caret = this._code_completion_suggestions.slice(
        0,
        this._caret_position
      )
      const after_caret = this._code_completion_suggestions.slice(
        this._caret_position
      )
      this._code_completion_suggestions = before_caret + text + after_caret

      // Update caret position to be after the inserted text
      this._caret_position += text.length

      this._context.workspaceState.update(
        'code-completion-suggestions',
        this._code_completion_suggestions
      )
      this.send_message<CodeCompletionSuggestionsMessage>({
        command: 'CODE_COMPLETION_SUGGESTIONS',
        value: this._code_completion_suggestions
      })
    } else {
      // Insert text at caret position for instructions
      const before_caret = this._instructions.slice(0, this._caret_position)
      const after_caret = this._instructions.slice(this._caret_position)
      this._instructions = before_caret + text + after_caret

      // Update caret position to be after the inserted text
      this._caret_position += text.length

      this._context.workspaceState.update('instructions', this._instructions)
      this.send_message<InstructionsMessage>({
        command: 'INSTRUCTIONS',
        value: this._instructions
      })
    }
  }

  // Public getters for properties needed by message handlers
  public get api_tools_settings_manager(): ApiToolsSettingsManager {
    return this._api_tools_settings_manager
  }
  public get is_code_completions_mode(): boolean {
    return this._is_code_completions_mode
  }
  public get instructions(): string {
    return this._instructions
  }
  public get code_completion_suggestions(): string {
    return this._code_completion_suggestions
  }
  public get edit_format(): EditFormat {
    return this._edit_format
  }
  public get workspace_provider(): WorkspaceProvider {
    return this._workspace_provider
  }
  public get open_editors_provider(): OpenEditorsProvider {
    return this._open_editors_provider
  }
  public get websites_provider(): WebsitesProvider {
    return this._websites_provider
  }
  public get context(): vscode.ExtensionContext {
    return this._context
  }
  public get websocket_server_instance(): WebSocketManager {
    return this._websocket_server_instance
  }
}
