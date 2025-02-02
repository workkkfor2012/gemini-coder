import * as vscode from 'vscode'
import { file_tree_initialization } from './file-tree/file-tree-initialization'
import { refactor_file_command } from './commands/refactor-file-command'
import { request_fim_completion } from './commands/request-fim-completion-command'
import { copy_fim_completion_prompt_command } from './commands/copy-fim-completion-prompt-command'
import { change_default_model_command } from './commands/change-default-model-command'
import { ChatViewProvider } from './chat-view/chat-view-provider'
import { open_web_chat_with_fim_completion_prompt_command } from './commands/open-web-chat-with-fim-completion-prompt-command'
import { open_web_chat_with_apply_changes_prompt_command } from './commands/open-web-chat-with-apply-changes-prompt-command'
import { open_web_chat_with_instruction_command } from './commands/open-web-chat-with-instruction-command'
import { copy_apply_changes_prompt_command } from './commands/copy-appy-changes-prompt-command'

export function activate(context: vscode.ExtensionContext) {
  const file_tree_provider = file_tree_initialization(context)
  // Default models status bar item
  const status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  status_bar_item.command = 'geminiCoder.changeDefaultModel'
  context.subscriptions.push(status_bar_item)
  update_status_bar(status_bar_item)

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
    refactor_file_command(context, file_tree_provider, status_bar_item),
    request_fim_completion(
      'geminiCoder.requestFimCompletion',
      file_tree_provider,
      context
    ),
    copy_fim_completion_prompt_command(file_tree_provider),
    copy_apply_changes_prompt_command(file_tree_provider),
    change_default_model_command(status_bar_item),
    open_web_chat_with_fim_completion_prompt_command(
      context,
      file_tree_provider
    ),
    open_web_chat_with_apply_changes_prompt_command(
      context,
      file_tree_provider
    ),
    open_web_chat_with_instruction_command(context, file_tree_provider)
  )
}

export function deactivate() {}

async function update_status_bar(status_bar_item: vscode.StatusBarItem) {
  const default_model_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiCoder.defaultModel')

  status_bar_item.text = `${default_model_name || 'Select Model'}`
  status_bar_item.show()
}
