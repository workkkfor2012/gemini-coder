import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { Logger } from '@/utils/logger'
import {
  get_git_repository,
  prepare_staged_changes,
  GitRepository
} from '../helpers/git-repository-utils'
import {
  get_commit_message_config,
  get_ignored_extensions,
  collect_affected_files_with_metadata,
  handle_file_selection_if_needed,
  build_files_content,
  generate_commit_message_with_api,
  build_commit_message_prompt
} from '../helpers/commit-message-generator'

export function commit_changes_command(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand(
    'codeWebChat.commitChanges',
    async (source_control?: vscode.SourceControl) => {
      const repository = get_git_repository(source_control)
      if (!repository) return

      try {
        const diff = await prepare_staged_changes(repository)
        if (!diff) return

        const commit_message = await generate_commit_message(
          context,
          repository,
          diff
        )

        if (!commit_message) return

        try {
          execSync(`git commit -m "${commit_message.replace(/"/g, '\\"')}"`, {
            cwd: repository.rootUri.fsPath
          })

          vscode.window.showInformationMessage(
            `New commit: "${commit_message}".`
          )

          await repository.status()
        } catch (commit_error) {
          Logger.error({
            function_name: 'commit_changes_command',
            message: 'Error committing changes',
            data: commit_error
          })
          vscode.window.showErrorMessage('Failed to commit changes.')
        }
      } catch (error) {
        Logger.error({
          function_name: 'commit_changes_command',
          message: 'Error in commit changes command',
          data: error
        })
        vscode.window.showErrorMessage(
          'Error committing changes. See console for details.'
        )
      }
    }
  )
}

async function generate_commit_message(
  context: vscode.ExtensionContext,
  repository: GitRepository,
  diff: string
): Promise<string | null> {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const commit_message_prompt = config.get<string>('commitMessageInstructions')
  const all_ignored_extensions = get_ignored_extensions()

  const api_config = await get_commit_message_config(context)
  if (!api_config) return null

  const affected_files_data = await collect_affected_files_with_metadata(
    repository,
    all_ignored_extensions
  )

  const selected_files = await handle_file_selection_if_needed(
    context,
    affected_files_data
  )
  if (!selected_files) return null

  const affected_files = build_files_content(selected_files)
  const message = build_commit_message_prompt(
    commit_message_prompt!,
    affected_files,
    diff
  )

  return await generate_commit_message_with_api(
    api_config.endpoint_url,
    api_config.provider,
    api_config.config,
    message,
    'Generating commit message and committing...'
  )
}
