import * as vscode from 'vscode'
import { file_tree_initialization } from './file-tree/file-tree-initialization'
import { apply_changes_command } from './commands/apply-changes-command'
import { request_fim_completion_command } from './commands/request-fim-completion-command'
import { copy_fim_completion_prompt_command } from './commands/copy-fim-completion-prompt-command'
import { change_default_model_command } from './commands/change-default-model-command'
import { ChatViewProvider } from './chat-view/chat-view-provider'
import { open_web_chat_with_fim_completion_prompt_command } from './commands/open-web-chat-with-fim-completion-prompt-command'
import { open_web_chat_with_apply_changes_prompt_command } from './commands/open-web-chat-with-apply-changes-prompt-command'
import { open_web_chat_with_instruction_command } from './commands/open-web-chat-with-instruction-command'
import { copy_apply_changes_prompt_command } from './commands/copy-apply-changes-prompt-command'
import { compose_chat_prompt_command } from './commands/compose-chat-prompt-command'
import { create_apply_changes_status_bar_item } from './status-bar/create-apply-changes-status-bar-item'
import { create_refactor_status_bar_item } from './status-bar/create-refactor-status-bar-item'
import { create_default_model_status_bar_item } from './status-bar/create-default-model-status-bar-item'
import { refactor_with_instruction_command } from './commands/refactor-with-instruction-command'
import { copy_refactoring_prompt_command } from './commands/copy-refactoring-prompt-command'
import { open_web_chat_with_refactoring_instruction_command } from './commands/open-web-chat-with-refactoring-instruction-command'
import { change_default_refactoring_model_command } from './commands/change-default-refactoring-model-command'

export function activate(context: vscode.ExtensionContext) {
  const file_tree_provider = file_tree_initialization(context)

  // Status bar
  const default_model_status_bar_item =
    create_default_model_status_bar_item(context)
  create_refactor_status_bar_item(context)
  create_apply_changes_status_bar_item(context)

  // Chat View
  const chat_view_provider = new ChatViewProvider(
    context.extensionUri,
    file_tree_provider,
    context
  )
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'geminiCoderViewChat',
      chat_view_provider
    )
  )

  context.subscriptions.push(
    apply_changes_command(context, file_tree_provider),
    refactor_with_instruction_command(context, file_tree_provider),
    copy_refactoring_prompt_command(context, file_tree_provider),
    open_web_chat_with_refactoring_instruction_command(
      context,
      file_tree_provider
    ),
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
    copy_apply_changes_prompt_command(file_tree_provider),
    change_default_model_command(default_model_status_bar_item),
    change_default_refactoring_model_command(),
    open_web_chat_with_fim_completion_prompt_command(
      context,
      file_tree_provider
    ),
    open_web_chat_with_apply_changes_prompt_command(
      context,
      file_tree_provider
    ),
    open_web_chat_with_instruction_command(context, file_tree_provider),
    compose_chat_prompt_command(context, file_tree_provider)
  )
}

export function deactivate() {}
