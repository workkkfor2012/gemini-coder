import * as vscode from 'vscode'
import { Logger } from '@/utils/logger'
import {
  get_git_repository,
  prepare_staged_changes
} from '../utils/git-repository-utils'
import {
  get_commit_message_config,
  get_ignored_extensions,
  collect_affected_files_with_metadata,
  handle_file_selection_if_needed,
  build_files_content,
  generate_commit_message_with_api,
  build_commit_message_prompt
} from '../helpers/commit-message-generator'

export function generate_commit_message_command(
  context: vscode.ExtensionContext
) {
  return vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control: vscode.SourceControl) => {
      const repository = get_git_repository(source_control)
      if (!repository) return

      try {
        const diff = await prepare_staged_changes(repository)
        if (!diff) return

        const config = vscode.workspace.getConfiguration('codeWebChat')
        const commit_message_prompt = config.get<string>(
          'commitMessageInstructions'
        )
        const all_ignored_extensions = get_ignored_extensions()

        const api_config = await get_commit_message_config(context)
        if (!api_config) return

        const affected_files_data = await collect_affected_files_with_metadata(
          repository,
          all_ignored_extensions
        )

        const selected_files = await handle_file_selection_if_needed(
          context,
          affected_files_data
        )
        if (!selected_files) return

        const affected_files = build_files_content(selected_files)
        const message = build_commit_message_prompt(
          commit_message_prompt!,
          affected_files,
          diff
        )

        const commit_message = await generate_commit_message_with_api(
          api_config.endpoint_url,
          api_config.provider,
          api_config.config,
          message,
          'Waiting for a commit message...'
        )

        if (commit_message) {
          repository.inputBox.value = commit_message
        }
      } catch (error) {
        Logger.error({
          function_name: 'generate_commit_message_command',
          message: 'Error generating commit message',
          data: error
        })
        vscode.window.showErrorMessage(
          'Error generating commit message. See console for details.'
        )
      }
    }
  )
}
