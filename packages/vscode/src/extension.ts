import * as vscode from 'vscode'
import { file_tree_initialization } from './file-tree/file-tree-initialization'
import { apply_changes_command } from './commands/apply-changes-command'
import { request_fim_completion_command } from './commands/request-fim-completion-command'
import { copy_fim_completion_prompt_command } from './commands/copy-fim-completion-prompt-command'
import { ChatViewProvider } from './chat-view/chat-view-provider'
import { open_web_chat_with_instruction_command } from './commands/open-web-chat-with-instruction-command'
import { copy_apply_changes_prompt_command } from './commands/copy-apply-changes-prompt-command'
import { compose_chat_prompt_command } from './commands/compose-chat-prompt-command'
import { create_apply_changes_status_bar_item } from './status-bar/create-apply-changes-status-bar-item'
import { create_refactor_status_bar_item } from './status-bar/create-refactor-status-bar-item'
import { refactor_command } from './commands/refactor-command'
import { copy_refactoring_prompt_command } from './commands/copy-refactoring-prompt-command'
import { WebSocketServer } from './services/websocket-server'
import { create_fim_status_bar_item } from './status-bar/create-fim-status-bar-item'
import { ApiViewProvider } from './api-view/api-view-provider'
import { change_default_model_command } from './commands/change-default-model-command'

// Store WebSocketServer instance at module level
let websocket_server_instance: WebSocketServer | null = null

export function activate(context: vscode.ExtensionContext) {
  websocket_server_instance = new WebSocketServer(context)

  const file_tree_provider = file_tree_initialization(context)

  // Status bar
  create_refactor_status_bar_item(context)
  create_apply_changes_status_bar_item(context)
  create_fim_status_bar_item(context)

  // Chat View
  const chat_view_provider = new ChatViewProvider(
    context.extensionUri,
    file_tree_provider,
    context,
    websocket_server_instance
  )
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'geminiCoderViewChat',
      chat_view_provider
    )
  )

  // API View
  const api_view_provider = new ApiViewProvider(context.extensionUri)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'geminiCoderViewApi',
      api_view_provider
    )
  )

  context.subscriptions.push(
    apply_changes_command({
      command: 'geminiCoder.applyChanges',
      file_tree_provider,
      context,
      use_default_model: true
    }),
    apply_changes_command({
      command: 'geminiCoder.applyChangesWith',
      file_tree_provider,
      context
    }),
    refactor_command({
      command: 'geminiCoder.refactor',
      context,
      file_tree_provider,
      use_default_model: true
    }),
    refactor_command({
      command: 'geminiCoder.refactorWith',
      context,
      file_tree_provider
    }),
    copy_refactoring_prompt_command(context, file_tree_provider),
    request_fim_completion_command({
      command: 'geminiCoder.requestFimCompletionWith',
      file_tree_provider,
      context
    }),
    request_fim_completion_command({
      command: 'geminiCoder.requestFimCompletion',
      file_tree_provider,
      context,
      use_default_model: true
    }),
    copy_fim_completion_prompt_command(file_tree_provider),
    change_default_model_command('fim'),
    change_default_model_command('refactoring'),
    change_default_model_command('apply_changes'),
    copy_apply_changes_prompt_command(file_tree_provider),
    open_web_chat_with_instruction_command(
      context,
      file_tree_provider,
      websocket_server_instance
    ),
    compose_chat_prompt_command(context, file_tree_provider),
    {
      dispose: () => {
        if (websocket_server_instance) {
          websocket_server_instance.dispose()
          websocket_server_instance = null
        }
      }
    }
  )
}

export function deactivate() {
  if (websocket_server_instance) {
    websocket_server_instance.dispose()
    websocket_server_instance = null
  }
}
