import * as vscode from 'vscode'
import { file_tree_initialization } from './file-tree/file-tree-initialization'
import { refactor_file_command } from './commands/refactor-file-command'
import { completion_request_command } from './commands/completion-request-command'
import { copy_autocomplete_prompt_command } from './commands/copy-autocomplete-prompt-command'
import { copy_refactor_prompt_command } from './commands/copy-refactor-prompt-command'
import { change_default_provider_command } from './commands/change-default-provider-command'
import { ChatViewProvider } from './chat-view/chat-view-provider'
import { open_web_chat_with_autocompletion_prompt_command } from './commands/open-web-chat-with-autocompletion-prompt-command'
import { open_web_chat_with_refactor_prompt_command } from './commands/open-web-chat-with-refactor-prompt-command'

export function activate(context: vscode.ExtensionContext) {
  const file_tree_provider = file_tree_initialization(context)
  const status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  status_bar_item.command = 'geminiCoder.changeDefaultProvider'
  context.subscriptions.push(status_bar_item)
  update_status_bar(status_bar_item)

  // Chat View
  const chat_view_provider = new ChatViewProvider(
    context.extensionUri,
    file_tree_provider
  )
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'geminiCoderViewChat',
      chat_view_provider
    )
  )

  context.subscriptions.push(
    refactor_file_command(context, file_tree_provider, status_bar_item),
    completion_request_command(
      'geminiCoder.sendCompletionRequestPrimary',
      'primary',
      file_tree_provider,
      status_bar_item
    ),
    completion_request_command(
      'geminiCoder.sendCompletionRequestSecondary',
      'secondary',
      file_tree_provider,
      status_bar_item
    ),
    copy_autocomplete_prompt_command(file_tree_provider),
    copy_refactor_prompt_command(file_tree_provider),
    change_default_provider_command(status_bar_item),
    open_web_chat_with_autocompletion_prompt_command(file_tree_provider),
    open_web_chat_with_refactor_prompt_command(file_tree_provider)
  )
}

export function deactivate() {}

async function update_status_bar(status_bar_item: vscode.StatusBarItem) {
  const primary_provider_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiCoder.primaryModel')
  const secondary_provider_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiCoder.secondaryModel')

  status_bar_item.text = `${primary_provider_name || 'Select Primary Model'} (${
    secondary_provider_name || 'Select Secondary Model'
  })`
  status_bar_item.show()
}
