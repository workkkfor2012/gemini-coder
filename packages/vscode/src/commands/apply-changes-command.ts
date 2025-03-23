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
  file_path: string
  content: string
}

/**
 * Parse clipboard text to check for multiple files format
 */
function parse_clipboard_multiple_files(
  clipboard_text: string
): ClipboardFile[] {
  // More specific regex that better handles the boundary between filename and content
  const file_block_regex = /```(?:(\w+))?\s+name=([^`\n]+?)\s*\n([\s\S]*?)```/g
  const files: ClipboardFile[] = []

  let match
  while ((match = file_block_regex.exec(clipboard_text)) !== null) {
    try {
      const file_path = match[2].trim() // Trim to remove any trailing whitespace
      const content = match[3]

      // Validation checks
      if (!file_path) {
        console.warn('Skipping file block with empty filepath')
        continue
      }

      files.push({
        file_path,
        content
      })
    } catch (error) {
      console.error('Error parsing file block:', error)
      // Continue to next match rather than failing completely
    }
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
 * Format document using VS Code's formatDocument command
 */
async function format_document(document: vscode.TextDocument): Promise<void> {
  try {
    await vscode.commands.executeCommand(
      'editor.action.formatDocument',
      document.uri
    )
  } catch (error) {
    console.error(`Error formatting document: ${error}`)
    // Continue even if formatting fails
  }
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
  const file_content = `<file name="${params.filePath}"><![CDATA[${params.fileContent}]]></file>`
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

  // Format the new file
  await format_document(document)

  return true
}

/**
 * Replace files directly without AI processing
 */
async function replace_files_directly(
  files: ClipboardFile[]
): Promise<boolean> {
  try {
    // First, check if any file doesn't exist and needs to be created
    const new_files: ClipboardFile[] = []
    const existing_files: ClipboardFile[] = []

    for (const file of files) {
      // Check if file exists in workspace
      const file_exists = await vscode.workspace
        .findFiles(file.file_path, null, 1)
        .then((files) => files.length > 0)

      if (file_exists) {
        existing_files.push(file)
      } else {
        new_files.push(file)
      }
    }

    // If there are new files, ask for confirmation before proceeding
    if (new_files.length > 0) {
      const new_file_list = new_files.map((file) => file.file_path).join('\n- ')
      const confirmation = await vscode.window.showWarningMessage(
        `This will create ${new_files.length} new ${
          new_files.length == 1 ? 'file' : 'files'
        }:\n- ${new_file_list}\n\nDo you want to continue?`,
        { modal: true },
        'Yes',
        'No'
      )

      if (confirmation !== 'Yes') {
        vscode.window.showInformationMessage(
          'Operation cancelled. No files were modified.'
        )
        return false
      }
    }

    // Apply changes to all files
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Replacing files',
        cancellable: true
      },
      async (progress, token) => {
        let processed_count = 0
        const total_count = files.length

        for (const file of files) {
          if (token.isCancellationRequested) {
            vscode.window.showInformationMessage('Operation cancelled by user.')
            return false
          }

          // Check if file exists in workspace
          const file_exists = await vscode.workspace
            .findFiles(file.file_path, null, 1)
            .then((files) => files.length > 0)

          if (file_exists) {
            // Replace existing file
            const file_uri = vscode.Uri.file(
              path.join(
                vscode.workspace.workspaceFolders![0].uri.fsPath,
                file.file_path
              )
            )
            const document = await vscode.workspace.openTextDocument(file_uri)
            const editor = await vscode.window.showTextDocument(document)
            await editor.edit((edit) => {
              edit.replace(
                new vscode.Range(
                  document.positionAt(0),
                  document.positionAt(document.getText().length)
                ),
                file.content
              )
            })

            // Format the document
            await format_document(document)

            await document.save()
          } else {
            // Create new file
            await create_file_if_needed(file.file_path, file.content)
          }

          processed_count++
          progress.report({
            message: `${processed_count}/${total_count} files processed`,
            increment: (1 / total_count) * 100
          })
        }

        vscode.window.showInformationMessage(
          `Successfully replaced ${total_count} ${
            total_count > 1 ? 'files' : 'file'
          }.`
        )
        return true
      }
    )

    return true
  } catch (error: any) {
    console.error('Error during direct file replacement:', error)
    vscode.window.showErrorMessage(
      `An error occurred while replacing files: ${
        error.message || 'Unknown error'
      }`
    )
    return false
  }
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

    if (is_multiple_files) {
      // Get the last used apply changes mode from global state
      const last_used_mode = params.context.globalState.get<string>(
        'lastUsedApplyChangesMode',
        'Intelligent update'
      )

      // Create mode options with the last used mode at the top
      const mode_options = [
        {
          label: last_used_mode,
          description:
            last_used_mode === 'Intelligent update'
              ? 'Use AI to apply shortened files'
              : 'Suitable if files are in a "whole" format'
        },
        {
          label:
            last_used_mode === 'Intelligent update'
              ? 'Fast replace'
              : 'Intelligent update',
          description:
            last_used_mode === 'Intelligent update'
              ? 'Suitable if files are in a "whole" format'
              : 'Use AI to apply shortened files'
        }
      ]

      const selected_mode = await vscode.window.showQuickPick(mode_options, {
        placeHolder: 'Choose how to apply changes'
      })

      if (!selected_mode) {
        return // User cancelled
      }

      // Save the selected mode as the last used mode
      params.context.globalState.update(
        'lastUsedApplyChangesMode',
        selected_mode.label
      )

      // Handle Fast replace mode
      if (selected_mode.label == 'Fast replace') {
        const files = parse_clipboard_multiple_files(clipboard_text)
        await replace_files_directly(files)
        return
      }
    }

    // Continue with Intelligent mode (existing logic)
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

      // First, identify which files are new (don't exist in workspace)
      const new_files: ClipboardFile[] = []
      const existing_files: ClipboardFile[] = []

      for (const file of files) {
        // Check if file exists in workspace
        const file_exists = await vscode.workspace
          .findFiles(file.file_path, null, 1)
          .then((files) => files.length > 0)

        if (file_exists) {
          existing_files.push(file)
        } else {
          new_files.push(file)
        }
      }

      // If there are new files, ask for confirmation before proceeding
      if (new_files.length > 0) {
        const new_file_list = new_files
          .map((file) => file.file_path)
          .join('\n- ')
        const confirmation = await vscode.window.showWarningMessage(
          `This will create ${new_files.length} new ${
            new_files.length == 1 ? 'file' : 'files'
          }:\n- ${new_file_list}\n\nDo you want to continue?`,
          { modal: true },
          'Yes',
          'No'
        )

        if (confirmation !== 'Yes') {
          vscode.window.showInformationMessage(
            'Operation cancelled. No files were modified.'
          )
          return
        }
      }

      // Update the message to accurately reflect what's happening
      let progress_title = ''

      if (existing_files.length > 0 && new_files.length > 0) {
        // Mixed case: both updating existing files and creating new ones
        progress_title = `Updating ${existing_files.length} file${
          existing_files.length > 1 ? 's' : ''
        } and creating ${new_files.length} new file${
          new_files.length > 1 ? 's' : ''
        }`
      } else if (existing_files.length > 0) {
        // Only updating existing files
        progress_title =
          existing_files.length > 1
            ? `Waiting for ${existing_files.length} updated files`
            : 'Waiting for the updated file'
      } else {
        // Only creating new files
        progress_title = `Creating ${new_files.length} new file${
          new_files.length > 1 ? 's' : ''
        }`
      }

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: progress_title,
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
            isNew: boolean
            filePath: string
          }
          const documentChanges: DocumentChange[] = []

          // Focus on the largest file for progress tracking
          let largest_file: { path: string; size: number } | null = null
          let largest_file_progress = 0 // Progress percentage for largest file
          let previous_largest_file_progress = 0 // Track previous progress value
          let completed_count = 0

          try {
            // Find largest existing file to track
            for (const file of existing_files) {
              try {
                const file_uri = vscode.Uri.file(
                  path.join(
                    vscode.workspace.workspaceFolders![0].uri.fsPath,
                    file.file_path
                  )
                )
                const document = await vscode.workspace.openTextDocument(
                  file_uri
                )
                const content_size = document.getText().length

                if (!largest_file || content_size > largest_file.size) {
                  largest_file = {
                    path: file.file_path,
                    size: content_size
                  }
                }
              } catch (error) {
                console.log(
                  `Error checking file size for ${file.file_path}`,
                  error
                )
              }
            }

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
                    .findFiles(file.file_path, null, 1)
                    .then((files) => files.length > 0)

                  // For new files, just store the information for creation later
                  if (!file_exists) {
                    completed_count++
                    return {
                      document: null,
                      content: file.content,
                      isNew: true,
                      filePath: file.file_path
                    }
                  }

                  // For existing files, process them with AI
                  const file_uri = vscode.Uri.file(
                    path.join(
                      vscode.workspace.workspaceFolders![0].uri.fsPath,
                      file.file_path
                    )
                  )

                  const document = await vscode.workspace.openTextDocument(
                    file_uri
                  )
                  const document_text = document.getText()

                  // Process the file content with AI
                  const updated_content = await process_file({
                    provider,
                    filePath: file.file_path,
                    fileContent: document_text,
                    instruction: file.content,
                    system_instructions,
                    verbose: verbose || false,
                    cancelToken: cancel_token_source.token,
                    onProgress: (receivedLength, totalLength) => {
                      // Only update progress if this is the largest file
                      if (largest_file && file.file_path == largest_file.path) {
                        previous_largest_file_progress = largest_file_progress
                        largest_file_progress = Math.min(
                          Math.round((receivedLength / totalLength) * 100),
                          100
                        )

                        // Calculate the increment since last update
                        const increment =
                          largest_file_progress - previous_largest_file_progress

                        progress.report({
                          increment: increment > 0 ? increment : 0
                        })
                      }
                    }
                  })

                  // Handle errors and rate limits
                  if (!updated_content) {
                    throw new Error(
                      `Failed to apply changes to ${file.file_path}`
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
                          content: `<file name="${file.file_path}">\n<![CDATA[\n${document_text}\n]]>\n</file>\n${apply_changes_instruction} ${file.content}`
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
                        `Rate limit reached for ${file.file_path} and fallback failed`
                      )
                    }

                    completed_count++

                    // Update progress if this is the largest file
                    if (largest_file && file.file_path == largest_file.path) {
                      // Calculate increment for final progress update
                      const increment = 100 - largest_file_progress
                      largest_file_progress = 100
                      progress.report({
                        increment: increment > 0 ? increment : 0
                      })
                    }

                    // Store the document and its new content for applying later
                    return {
                      document,
                      content: cleanup_api_response({
                        content: fallback_content,
                        end_with_new_line: true
                      }),
                      isNew: false,
                      filePath: file.file_path
                    }
                  } else {
                    completed_count++

                    // Update progress if this is the largest file
                    if (largest_file && file.file_path === largest_file.path) {
                      // Calculate increment for final progress update
                      const increment = 100 - largest_file_progress
                      largest_file_progress = 100
                      progress.report({
                        increment: increment > 0 ? increment : 0
                      })
                    }

                    // Store the document and its new content for applying later
                    return {
                      document,
                      content: updated_content,
                      isNew: false,
                      filePath: file.file_path
                    }
                  }
                } catch (error: any) {
                  // Re-throw the error to be caught by the Promise.all
                  if (axios.isCancel(error)) {
                    throw new Error('Operation cancelled')
                  } else {
                    console.error(
                      `Error processing file ${file.file_path}:`,
                      error
                    )
                    throw new Error(
                      `Error processing ${file.file_path}: ${
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
                documentChanges.push(result)
              }
            }

            // Only apply changes if ALL files were processed successfully
            // Apply all changes and create new files in a second pass
            for (const change of documentChanges) {
              // For new files, create them
              if (change.isNew) {
                await create_file_if_needed(change.filePath, change.content)
                continue
              }

              // For existing files, apply the changes
              const document = change.document
              if (!document) continue
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

              // Format the document after applying changes
              await format_document(document)

              await document.save()
            }

            vscode.window.showInformationMessage(
              `Successfully updated ${total_files} ${
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
                    content: `<file name="${file_path}">\n<![CDATA[\n${document_text}\n]]>\n</file>\n${apply_changes_instruction} ${instruction}`
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

              // Format the document after applying changes
              await format_document(document)

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

            // Format the document after applying changes
            await format_document(document)

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
