import * as vscode from 'vscode'
import { file_tree_initialization } from './file-tree/file-tree-initialization'
import { refactor_file_command } from './commands/refactor-file-command'
import { completion_request_command } from './commands/completion-request-command'
import { copy_autocomplete_prompt_command } from './commands/copy-autocomplete-prompt-command'
import { copy_refactor_prompt_command } from './commands/copy-refactor-prompt-command'
import { change_default_provider_command } from './commands/change-default-provider-command'

export function activate(context: vscode.ExtensionContext) {
  const file_tree_provider = file_tree_initialization(context)
  const status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  status_bar_item.command = 'geminiCoder.changeDefaultProvider'
  context.subscriptions.push(status_bar_item)
  update_status_bar(status_bar_item)

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
    change_default_provider_command(status_bar_item)
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
