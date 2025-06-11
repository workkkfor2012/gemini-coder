import * as vscode from 'vscode'
import axios from 'axios'
import * as path from 'path'
import * as fs from 'fs'
import { make_api_request } from '../helpers/make-api-request'
import { execSync } from 'child_process'
import { Logger } from '@/helpers/logger'
import { should_ignore_file } from '../context/utils/extension-utils'
import { process_single_trailing_dot } from '@/utils/process-single-trailing-dot/process-single-trailing-dot'
import { ApiProvidersManager } from '../services/api-providers-manager'
import { ignored_extensions } from '@/context/constants/ignored-extensions'
import { PROVIDERS } from '@shared/constants/providers'
import { COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY } from '../constants/state-keys'

export function generate_commit_message_command(
  context: vscode.ExtensionContext
) {
  return vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control: vscode.SourceControl) => {
      const git_extension = vscode.extensions.getExtension('vscode.git')
      if (!git_extension) {
        vscode.window.showErrorMessage('Git extension not found.')
        return
      }

      const git_api = git_extension.exports.getAPI(1)

      const repositories = git_api.repositories
      if (!repositories || repositories.length == 0) {
        vscode.window.showErrorMessage('No Git repository found.')
        return
      }

      const repository = repositories.find(
        (repo: any) =>
          repo.rootUri.toString() == source_control.rootUri?.toString()
      )

      if (!repository) {
        vscode.window.showErrorMessage('Repository not found.')
        return
      }

      try {
        const staged_changes = repository.state.indexChanges || []

        if (staged_changes.length == 0) {
          await repository.add([])
          await new Promise((resolve) => setTimeout(resolve, 500))
        }

        const diff = execSync('git diff --staged', {
          cwd: repository.rootUri.fsPath
        }).toString()

        if (!diff || diff.length == 0) {
          vscode.window.showInformationMessage('No changes to commit.')
          return
        }

        const config = vscode.workspace.getConfiguration('codeWebChat')
        const commit_message_prompt = config.get<string>(
          'commitMessageInstructions'
        )
        const config_ignored_extensions = new Set(
          config
            .get<string[]>('ignoredExtensions', [])
            .map((ext) => ext.toLowerCase().replace(/^\./, ''))
        )
        const all_ignored_extensions = new Set([
          ...ignored_extensions,
          ...config_ignored_extensions
        ])

        const api_providers_manager = new ApiProvidersManager(context)
        const commit_message_config =
          await api_providers_manager.get_commit_messages_tool_config()

        if (!commit_message_config) {
          vscode.window.showErrorMessage(
            'Commit Messages API tool is not configured. Navigate to the Settings tab, configure API providers and setup the API tool.'
          )
          Logger.warn({
            function_name: 'generate_commit_message_command',
            message: 'Commit Messages API tool is not configured.'
          })
          return
        }

        const provider = await api_providers_manager.get_provider(
          commit_message_config.provider_name
        )

        if (!provider) {
          vscode.window.showErrorMessage(
            'API provider not found for Commit Messages tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
          )
          Logger.warn({
            function_name: 'generate_commit_message_command',
            message: 'API provider not found for Commit Messages tool.'
          })
          return
        }

        if (!provider.api_key) {
          vscode.window.showErrorMessage(
            'API key is missing for the selected provider. Please add it in the Settings tab.'
          )
          return
        }

        let endpoint_url = ''
        if (provider.type == 'built-in') {
          const provider_info = PROVIDERS[provider.name]
          endpoint_url = provider_info.base_url
        } else {
          endpoint_url = provider.base_url
        }

        const affected_files_data = await collect_affected_files_with_metadata(
          repository,
          all_ignored_extensions
        )

        const threshold = context.globalState.get<number>(
          COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
          20000
        )

        const total_tokens = affected_files_data.reduce(
          (sum, file) => sum + file.estimated_tokens,
          0
        )

        let selected_files: FileData[] | undefined = affected_files_data
        if (total_tokens > threshold) {
          selected_files = await show_file_selection_dialog(
            affected_files_data,
            threshold
          )
          if (!selected_files || selected_files.length === 0) {
            vscode.window.showInformationMessage(
              'No files selected for commit message generation.'
            )
            return
          }
        }

        const affected_files = build_files_content(selected_files)
        const message = `${commit_message_prompt}\n${affected_files}\n${diff}\n${commit_message_prompt}`

        Logger.log({
          function_name: 'generate_commit_message_command',
          message: 'Getting commit message...',
          data: message
        })

        const token_count = Math.ceil(message.length / 4)
        const formatted_token_count =
          token_count > 1000 ? Math.ceil(token_count / 1000) + 'k' : token_count

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Waiting for a commit message... Sent about ${formatted_token_count} tokens.`,
            cancellable: true
          },
          async (_, token) => {
            const messages = [
              {
                role: 'user',
                content: message
              }
            ]

            const body = {
              messages,
              model: commit_message_config.model,
              temperature: commit_message_config.temperature
            }

            // Make API request
            const cancel_token_source = axios.CancelToken.source()

            token.onCancellationRequested(() => {
              cancel_token_source.cancel('Operation cancelled by user')
            })

            try {
              const response = await make_api_request(
                endpoint_url,
                provider.api_key,
                body,
                cancel_token_source.token
              )

              if (!response) {
                vscode.window.showErrorMessage(
                  'Failed to generate commit message.'
                )
              } else {
                let commit_message = process_single_trailing_dot(response)
                commit_message = strip_wrapping_quotes(commit_message)
                repository.inputBox.value = commit_message
              }
            } catch (error) {
              if (axios.isCancel(error)) {
                vscode.window.showInformationMessage(
                  'Commit message generation cancelled.'
                )
                return
              }
              Logger.error({
                function_name: 'generate_commit_message_command',
                message: 'Error during API request',
                data: error
              })
              throw error
            }
          }
        )
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

interface FileData {
  path: string
  relative_path: string
  content: string
  estimated_tokens: number
  status: number
  is_large_file: boolean
}

async function collect_affected_files_with_metadata(
  repository: any,
  ignored_extensions: Set<string>
): Promise<FileData[]> {
  try {
    const root_path = repository.rootUri.fsPath
    const staged_changes = repository.state.indexChanges || []

    if (!staged_changes.length) {
      return []
    }

    const files_data: FileData[] = []

    for (const change of staged_changes) {
      const file_path = change.uri.fsPath
      const relative_path = path.relative(root_path, file_path)

      if (should_ignore_file(file_path, ignored_extensions)) {
        continue
      }

      try {
        let content = ''
        let is_large_file = false

        if (change.status != 6) {
          try {
            content = fs.readFileSync(file_path, 'utf8')
            const estimated_tokens_raw = Math.ceil(content.length / 4)

            if (estimated_tokens_raw > 20000) {
              content = `[Large file not included]\n`
              is_large_file = true
            }
          } catch (err) {
            Logger.error({
              function_name: 'collect_affected_files_with_metadata',
              message: `Error reading file ${file_path}`,
              data: err
            })
          }
        }

        const estimated_tokens = Math.ceil(content.length / 4)

        files_data.push({
          path: file_path,
          relative_path,
          content,
          estimated_tokens,
          status: change.status,
          is_large_file
        })
      } catch (err) {
        Logger.error({
          function_name: 'collect_affected_files_with_metadata',
          message: `Error processing file ${file_path}`,
          data: err
        })
      }
    }

    return files_data
  } catch (error) {
    Logger.error({
      function_name: 'collect_affected_files_with_metadata',
      message: 'Error collecting changed files',
      data: error
    })
    return []
  }
}

async function show_file_selection_dialog(
  files_data: FileData[],
  threshold: number
): Promise<FileData[] | undefined> {
  // Filter out large files from the quick pick
  const files_for_selection = files_data.filter((file) => !file.is_large_file)

  if (files_for_selection.length == 0) {
    vscode.window.showInformationMessage(
      'All files are too large to include in commit message context.'
    )
    return []
  }

  const quick_pick_items = files_for_selection.map((file) => {
    const filename = path.basename(file.relative_path)
    const directory = path.dirname(file.relative_path)
    const dir_path = directory == '.' ? '' : directory

    const format_tokens = (tokens: number): string => {
      if (tokens >= 1000) {
        return Math.ceil(tokens / 1000) + 'k'
      }
      return tokens.toString()
    }

    return {
      label: filename,
      description: `${format_tokens(file.estimated_tokens)} ${dir_path}`,
      picked: true,
      file_data: file
    }
  })

  const total_tokens = files_for_selection.reduce(
    (sum, file) => sum + file.estimated_tokens,
    0
  )
  const formatted_total =
    total_tokens > 1000 ? Math.ceil(total_tokens / 1000) + 'k' : total_tokens

  const large_files_count = files_data.length - files_for_selection.length

  const format_threshold = (tokens: number): string => {
    if (tokens >= 1000) {
      return Math.ceil(tokens / 1000) + 'k'
    }
    return tokens.toString()
  }

  const formatted_threshold = format_threshold(threshold)

  const threshold_message =
    large_files_count > 0
      ? `Reached token threshold for affected files included as context for the commit message set at ${formatted_threshold} tokens. ${formatted_total} tokens across ${
          files_for_selection.length
        } file${
          files_for_selection.length == 1 ? '' : 's'
        } (excl. ${large_files_count} large file${
          large_files_count == 1 ? '' : 's'
        }).`
      : `Reached token threshold for affected files included as context for the commit message set at ${formatted_threshold} tokens. ${formatted_total} tokens across ${
          files_for_selection.length
        } file${files_for_selection.length == 1 ? '' : 's'}.`

  vscode.window.showInformationMessage(threshold_message)

  const placeholder = `Select affected files to include in context for the commit message`

  const selected_items = await vscode.window.showQuickPick(quick_pick_items, {
    canPickMany: true,
    placeHolder: placeholder,
    title: `Select Affected Files`
  })

  if (!selected_items) {
    return undefined
  }

  const selected_files = selected_items.map((item) => item.file_data)
  const large_files = files_data.filter((file) => file.is_large_file)

  return [...selected_files, ...large_files]
}

function build_files_content(files_data: FileData[]): string {
  if (!files_data.length) {
    return ''
  }

  let files_content = '<files>\n'

  for (const file of files_data) {
    files_content += `<file path="${file.relative_path}">\n<![CDATA[\n${file.content}\n]]>\n</file>\n`
  }

  files_content += '</files>'
  return files_content
}

function strip_wrapping_quotes(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim()
  }
  return text
}
