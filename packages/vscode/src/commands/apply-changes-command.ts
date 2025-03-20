import * as vscode from 'vscode'
import axios, { CancelToken } from 'axios'
import * as path from 'path'
import * as fs from 'fs'
import { Provider } from '../types/provider'
import { make_api_request } from '../helpers/make-api-request'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'
import { cleanup_api_response } from '../helpers/cleanup-api-response'
import { handle_rate_limit_fallback } from '../helpers/handle-rate-limit-fallback'
import { ModelManager } from '../services/model-manager'
import { apply_changes_instruction } from '../constants/instructions'

// Interface for clipboard file data
interface ClipboardFile {
  filePath: string
  content: string
}

/**
 * Parse clipboard text to check for multiple files format
 */
function parse_clipboard_multiple_files(
  clipboardText: string
): ClipboardFile[] {
  // Regex to match code blocks with file name headers
  const file_block_regex = /```(\w+)?\s*name=([^\s]+)\s*([\s\S]*?)```/g
  const files: ClipboardFile[] = []

  let match
  while ((match = file_block_regex.exec(clipboardText)) !== null) {
    const filePath = match[2] // File path from the name=... part
    const content = match[3].trim() // Content between the backticks

    files.push({
      filePath,
      content
    })
  }

  return files
}

/**
 * Check if clipboard contains multiple files
 */
function is_multiple_files_clipboard(clipboardText: string): boolean {
  const file_block_regex = /```(\w+)?\s*name=([^\s]+)/g
  let matchCount = 0

  let match
  while ((match = file_block_regex.exec(clipboardText)) !== null) {
    matchCount++
    if (matchCount >= 1) {
      return true
    }
  }

  return false
}

async function get_selected_provider(
  context: vscode.ExtensionContext,
  all_providers: Provider[],
  default_model_name: string | undefined
): Promise<Provider | undefined> {
  if (
    !default_model_name ||
    !all_providers.some((p) => p.name == default_model_name)
  ) {
    vscode.window.showErrorMessage('Default model is not set or valid.')
    return undefined
  }

  // Get the last used models from global state
  let last_used_models = context.globalState.get<string[]>(
    'lastUsedApplyChangesModels',
    []
  )

  // Filter out the default model from last used models
  last_used_models = last_used_models.filter(
    (model) => model != default_model_name
  )

  // Construct the QuickPick items
  const quick_pick_items: any[] = [
    ...(default_model_name
      ? [
          {
            label: default_model_name,
            description: 'Currently set as default'
          }
        ]
      : []),
    ...last_used_models
      .map((model_name) => {
        const model_provider = all_providers.find((p) => p.name == model_name)
        if (model_provider) {
          return {
            label: model_name
          }
        }
        return null
      })
      .filter((item) => item !== null),
    ...all_providers
      .filter(
        (p) =>
          p.name != default_model_name && !last_used_models.includes(p.name)
      )
      .map((p) => ({
        label: p.name
      }))
  ]

  // Show the QuickPick selector
  const selected_item = await vscode.window.showQuickPick(quick_pick_items, {
    placeHolder: 'Select a model for applying changes'
  })

  if (!selected_item) {
    return undefined // User cancelled
  }

  // Determine selected model name
  const selected_model_name = selected_item.label

  const selected_provider = all_providers.find(
    (p) => p.name == selected_model_name
  )
  if (!selected_provider) {
    vscode.window.showErrorMessage(`Model "${selected_model_name}" not found.`)
    return undefined
  }

  // Update the last used models in global state
  last_used_models = [
    selected_model_name,
    ...last_used_models.filter((model) => model != selected_model_name)
  ]
  context.globalState.update('lastUsedApplyChangesModels', last_used_models)

  return selected_provider
}

/**
 * Process a single file with AI and apply changes
 */
async function process_file(params: {
  provider: Provider
  filePath: string
  fileContent: string
  instruction: string
  system_instructions?: string
  verbose: boolean
  cancelToken?: CancelToken // Add cancelToken parameter
  onProgress?: (chunkLength: number, totalLength: number) => void
}): Promise<string | null> {
  const apply_changes_prompt = `${apply_changes_instruction} ${params.instruction}`
  const file_content = `<file path="${params.filePath}"><![CDATA[${params.fileContent}]]></file>`
  const content = `${file_content}\n${apply_changes_prompt}`

  const messages = [
    ...(params.system_instructions
      ? [{ role: 'system', content: params.system_instructions }]
      : []),
    {
      role: 'user',
      content
    }
  ]

  const body = {
    messages,
    model: params.provider.model,
    temperature: params.provider.temperature
  }

  if (params.verbose) {
    console.log(
      `[Gemini Coder] Apply Changes Prompt for ${params.filePath}:`,
      content
    )
  }

  // Use provided cancelToken instead of creating a new one
  try {
    let total_length = params.fileContent.length // Use file content length as base for progress
    let received_length = 0

    const refactored_content = await make_api_request(
      params.provider,
      body,
      params.cancelToken, // Use the passed cancelToken
      (chunk: string) => {
        // Update progress when receiving chunks
        received_length += chunk.length
        if (params.onProgress) {
          params.onProgress(received_length, total_length)
        }
      }
    )

    if (!refactored_content) {
      vscode.window.showErrorMessage(
        `Applying changes to ${params.filePath} failed. Please try again later.`
      )
      return null
    } else if (refactored_content == 'rate_limit') {
      return 'rate_limit'
    }

    return cleanup_api_response({
      content: refactored_content,
      end_with_new_line: true
    })
  } catch (error) {
    // Check if this is a cancellation error
    if (axios.isCancel(error)) {
      return null
    }

    // For other errors, show the error message as before
    console.error(`Refactoring error for ${params.filePath}:`, error)
    vscode.window.showErrorMessage(
      `An error occurred during refactoring ${params.filePath}. See console for details.`
    )
    return null
  }
}

/**
 * Create a new file if it doesn't exist
 */
async function create_file_if_needed(
  filePath: string,
  content: string
): Promise<boolean> {
  // Check if we have a workspace folder
  if (vscode.workspace.workspaceFolders?.length == 0) {
    vscode.window.showErrorMessage('No workspace folder open.')
    return false
  }

  const workspace_folder = vscode.workspace.workspaceFolders![0].uri.fsPath
  const full_path = path.join(workspace_folder, filePath)

  // Ensure directory exists
  const directory = path.dirname(full_path)
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
  }

  // Create the file
  fs.writeFileSync(full_path, content)

  // Open the file in editor
  const document = await vscode.workspace.openTextDocument(full_path)
  await vscode.window.showTextDocument(document)

  return true
}

export function apply_changes_command(params: {
  command: string
  file_tree_provider: any
  open_editors_provider?: any
  context: vscode.ExtensionContext
  use_default_model?: boolean
}) {
  const model_manager = new ModelManager(params.context)

  return vscode.commands.registerCommand(params.command, async () => {
    const config = vscode.workspace.getConfiguration()
    const clipboard_text = await vscode.env.clipboard.readText()

    if (!clipboard_text) {
      vscode.window.showErrorMessage('Clipboard is empty.')
      return
    }

    // Check if clipboard contains multiple files
    const is_multiple_files = is_multiple_files_clipboard(clipboard_text)

    const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
    const gemini_api_key = config.get<string>('geminiCoder.apiKey')
    const gemini_temperature = config.get<number>('geminiCoder.temperature')
    const verbose = config.get<boolean>('geminiCoder.verbose')
    const max_concurrency = 10

    // Get default model from global state instead of config
    const default_model_name = model_manager.get_default_apply_changes_model()

    const all_providers = [
      ...BUILT_IN_PROVIDERS.map((provider) => ({
        ...provider,
        bearerToken: gemini_api_key || '',
        temperature: gemini_temperature
      })),
      ...user_providers
    ]

    let provider: Provider | undefined
    if (params.use_default_model) {
      provider = all_providers.find((p) => p.name == default_model_name)
      if (!provider) {
        vscode.window.showErrorMessage(
          `Default apply changes model is not set or invalid. Please set it in the settings.`
        )
        return
      }
    } else {
      provider = await get_selected_provider(
        params.context,
        all_providers,
        default_model_name
      )
    }

    if (!provider) {
      return // Provider selection failed or was cancelled
    }

    if (!provider.bearerToken) {
      vscode.window.showErrorMessage(
        'Bearer token is missing. Please add it in the settings.'
      )
      return
    }

    const system_instructions = provider.systemInstructions

    if (is_multiple_files) {
      // Handle multiple files
      const files = parse_clipboard_multiple_files(clipboard_text)

      if (files.length == 0) {
        vscode.window.showErrorMessage(
          'No valid file content found in clipboard.'
        )
        return
      }

      const total_files = files.length

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title:
            total_files > 1
              ? `Waiting for ${total_files} updated files`
              : 'Waiting for the updated file',
          cancellable: true
        },
        async (progress, token) => {
          // Create a cancelToken that will be used for all API requests
          const cancel_token_source = axios.CancelToken.source()

          // Link VSCode cancellation token to our axios cancel token
          token.onCancellationRequested(() => {
            cancel_token_source.cancel('Cancelled by user.')
          })

          // Store document changes for applying in a second pass
          type DocumentChange = {
            document: vscode.TextDocument | null
            content: string
          }
          const documentChanges: DocumentChange[] = []

          // Track progress for each file
          const file_progresses = new Map<
            string,
            { received: number; total: number }
          >()
          const progress_per_file = 100 / total_files

          // Initialize progress tracking for each file
          files.forEach((file) => {
            file_progresses.set(file.filePath, { received: 0, total: 0 })
          })

          // Function to update progress for a specific file
          const update_file_progress = (
            filePath: string,
            receivedLength: number,
            totalLength: number
          ) => {
            const file_progress = file_progresses.get(filePath) || {
              received: 0,
              total: 0
            }
            const previous_received = file_progress.received

            // Update progress for this file
            file_progress.received = receivedLength
            file_progress.total = totalLength
            file_progresses.set(filePath, file_progress)

            // Calculate the increment since last update for this file
            const increment = receivedLength - previous_received

            // Calculate percentage of total progress this increment represents
            const incrementPercentage =
              (increment / totalLength) * progress_per_file

            // Calculate overall progress across all files
            let overall_progress = 0
            file_progresses.forEach((p) => {
              if (p.total > 0) {
                // Cap individual file progress at 100%
                const file_progress_percentage = Math.min(
                  p.received / p.total,
                  1.0
                )
                overall_progress += file_progress_percentage * progress_per_file
              }
            })

            // Cap overall progress at 100%
            overall_progress = Math.min(overall_progress, 100)

            // Update progress display
            progress.report({
              message: `${Math.round(overall_progress)}% received...`,
              increment: incrementPercentage
            })
          }

          try {
            // Process all files in parallel batches
            for (let i = 0; i < files.length; i += max_concurrency) {
              if (token.isCancellationRequested) {
                return
              }

              const batch = files.slice(i, i + max_concurrency)

              // Create an array to hold the promises for this batch
              const promises = batch.map(async (file) => {
                try {
                  // Check if file exists in workspace
                  const file_exists = await vscode.workspace
                    .findFiles(file.filePath, null, 1)
                    .then((files) => files.length > 0)

                  // For new files, just store the information for creation later
                  if (!file_exists) {
                    return {
                      filePath: file.filePath,
                      content: file.content,
                      isNew: true
                    }
                  }

                  // For existing files, process them with AI
                  const file_uri = vscode.Uri.file(
                    path.join(
                      vscode.workspace.workspaceFolders![0].uri.fsPath,
                      file.filePath
                    )
                  )

                  const document = await vscode.workspace.openTextDocument(
                    file_uri
                  )
                  const document_text = document.getText()

                  // Process the file content with AI
                  const updated_content = await process_file({
                    provider,
                    filePath: file.filePath,
                    fileContent: document_text,
                    instruction: file.content,
                    system_instructions,
                    verbose: verbose || false,
                    cancelToken: cancel_token_source.token,
                    onProgress: (receivedLength, totalLength) => {
                      update_file_progress(
                        file.filePath,
                        receivedLength,
                        totalLength
                      )
                    }
                  })

                  // Handle errors and rate limits
                  if (!updated_content) {
                    throw new Error(
                      `Failed to apply changes to ${file.filePath}`
                    )
                  }

                  if (updated_content == 'rate_limit') {
                    const body = {
                      messages: [
                        ...(system_instructions
                          ? [{ role: 'system', content: system_instructions }]
                          : []),
                        {
                          role: 'user',
                          content: `<file path="${file.filePath}">\n<![CDATA[\n${document_text}\n]]>\n</file>\n${apply_changes_instruction} ${file.content}`
                        }
                      ],
                      model: provider.model,
                      temperature: provider.temperature
                    }

                    const fallback_content = await handle_rate_limit_fallback(
                      all_providers,
                      default_model_name,
                      body,
                      cancel_token_source.token
                    )

                    if (!fallback_content) {
                      throw new Error(
                        `Rate limit reached for ${file.filePath} and fallback failed`
                      )
                    }

                    // Store the document and its new content for applying later
                    return {
                      document,
                      content: cleanup_api_response({
                        content: fallback_content,
                        end_with_new_line: true
                      }),
                      isNew: false
                    }
                  } else {
                    // Store the document and its new content for applying later
                    return {
                      document,
                      content: updated_content,
                      isNew: false
                    }
                  }
                } catch (error: any) {
                  // Re-throw the error to be caught by the Promise.all
                  if (axios.isCancel(error)) {
                    throw new Error('Operation cancelled')
                  } else {
                    console.error(
                      `Error processing file ${file.filePath}:`,
                      error
                    )
                    throw new Error(
                      `Error processing ${file.filePath}: ${
                        error.message || 'Unknown error'
                      }`
                    )
                  }
                }
              })

              // Wait for all promises in this batch and collect results
              // If any promise rejects, the whole Promise.all will reject
              const results = await Promise.all(promises)

              // Store results to process after all files have been processed
              for (const result of results) {
                if (result.isNew) {
                  // For new files, create them later
                  documentChanges.push({
                    document: null, // New files don't have a document yet
                    content: result.content
                  })
                } else {
                  // For existing files, store the document and new content
                  documentChanges.push({
                    document: result.document || null,
                    content: result.content
                  })
                }
              }
            }

            // Only apply changes if ALL files were processed successfully
            // Apply all changes and create new files in a second pass
            for (let i = 0; i < files.length; i++) {
              const file = files[i]
              const change = documentChanges[i]

              // For new files, create them
              if (!change.document) {
                await create_file_if_needed(file.filePath, file.content)
                continue
              }

              // For existing files, apply the changes
              const document = change.document
              const editor = await vscode.window.showTextDocument(document)
              await editor.edit((edit) => {
                edit.replace(
                  new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                  ),
                  change.content
                )
              })
              await document.save()
            }

            vscode.window.showInformationMessage(
              `Successfully processed ${total_files} ${
                total_files > 1 ? 'files' : 'file'
              }.`
            )
          } catch (error: any) {
            // If any file processing fails, cancel the entire operation
            cancel_token_source.cancel('Operation failed')

            // Show error message
            if (error.message == 'Operation cancelled') {
              vscode.window.showInformationMessage('Operation was cancelled.')
            } else {
              vscode.window.showErrorMessage(
                `Operation failed and was aborted: ${error.message}`
              )
            }
          }
        }
      )
    } else {
      // Single file
      const editor = vscode.window.activeTextEditor

      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.')
        return
      }

      const document = editor.document
      const document_text = document.getText()
      const instruction = clipboard_text
      const file_path = vscode.workspace.asRelativePath(document.uri)

      let cancel_token_source = axios.CancelToken.source()
      // Track previous length for progress calculation
      let previous_length = 0

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Waiting for the updated file',
          cancellable: true
        },
        async (progress, token) => {
          // Link VSCode cancellation token to our axios cancel token
          token.onCancellationRequested(() => {
            cancel_token_source.cancel()
          })

          try {
            const refactored_content = await process_file({
              provider,
              filePath: file_path,
              fileContent: document_text,
              instruction,
              system_instructions,
              verbose: verbose || false,
              cancelToken: cancel_token_source.token, // Pass the cancelToken
              onProgress: (receivedLength, totalLength) => {
                // Calculate actual increment since last progress report
                const actual_increment = receivedLength - previous_length
                previous_length = receivedLength

                // Calculate percentage for display
                const progressPercentage = Math.min(
                  receivedLength / totalLength,
                  1.0
                )
                const percentage = Math.round(progressPercentage * 100)

                // Calculate actual increment as percentage
                const increment_percentage =
                  (actual_increment / totalLength) * 100

                progress.report({
                  message: `${percentage}% received...`,
                  increment: increment_percentage
                })
              }
            })

            if (token.isCancellationRequested) {
              return
            }

            if (!refactored_content) {
              // If process_file returns null, it could be due to cancellation or an error
              // Since we've already handled cancellation, we only show an error for non-cancellation cases
              if (!token.isCancellationRequested) {
                vscode.window.showErrorMessage(
                  'Applying changes failed. Please try again later.'
                )
              }
              return
            } else if (refactored_content == 'rate_limit') {
              const body = {
                messages: [
                  ...(system_instructions
                    ? [{ role: 'system', content: system_instructions }]
                    : []),
                  {
                    role: 'user',
                    content: `<file path="${file_path}">\n<![CDATA[\n${document_text}\n]]>\n</file>\n${apply_changes_instruction} ${instruction}`
                  }
                ],
                model: provider.model,
                temperature: provider.temperature
              }

              const fallback_content = await handle_rate_limit_fallback(
                all_providers,
                default_model_name,
                body,
                cancel_token_source.token
              )

              if (!fallback_content) {
                return
              }

              // Continue with the fallback content
              const cleaned_content = cleanup_api_response({
                content: fallback_content,
                end_with_new_line: true
              })
              const full_range = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document_text.length)
              )
              await editor.edit((edit_builder) => {
                edit_builder.replace(full_range, cleaned_content)
              })

              vscode.window.showInformationMessage(`Changes have been applied!`)
              return
            }

            const cleaned_content = cleanup_api_response({
              content: refactored_content,
              end_with_new_line: true
            })

            const full_range = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document_text.length)
            )
            await editor.edit((edit_builder) => {
              edit_builder.replace(full_range, cleaned_content)
            })

            vscode.window.showInformationMessage(`Changes have been applied!`)
          } catch (error) {
            if (axios.isCancel(error)) {
              return
            }
            console.error('Refactoring error:', error)
            vscode.window.showErrorMessage(
              'An error occurred during refactoring. See console for details.'
            )
          }
        }
      )
    }
  })
}
