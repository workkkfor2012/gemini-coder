import * as vscode from 'vscode'
import axios from 'axios'
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
function parse_clipboard_multiple_files(clipboardText: string): ClipboardFile[] {
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
async function process_file(
  params: {
    provider: Provider;
    filePath: string;
    fileContent: string;
    instruction: string;
    system_instructions: string | undefined;
    verbose: boolean;
    onProgress?: (chunkLength: number, totalLength: number) => void;
  }
): Promise<string | null> {
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
    console.log(`[Gemini Coder] Apply Changes Prompt for ${params.filePath}:`, content)
  }

  const cancel_token_source = axios.CancelToken.source()

  try {
    let totalLength = params.fileContent.length // Use file content length as base for progress
    let receivedLength = 0

    const refactored_content = await make_api_request(
      params.provider,
      body,
      cancel_token_source.token,
      (chunk: string) => {
        // Update progress when receiving chunks
        receivedLength += chunk.length
        if (params.onProgress) {
          params.onProgress(receivedLength, totalLength)
        }
      }
    )

    if (!refactored_content) {
      vscode.window.showErrorMessage(
        `Applying changes to ${params.filePath} failed. Please try again later.`
      )
      return null
    } else if (refactored_content === 'rate_limit') {
      return 'rate_limit'
    }

    return cleanup_api_response({
      content: refactored_content,
      end_with_new_line: true
    })
  } catch (error) {
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
async function createFileIfNeeded(
  filePath: string,
  content: string
): Promise<boolean> {
  // Check if we have a workspace folder
  if (vscode.workspace.workspaceFolders?.length === 0) {
    vscode.window.showErrorMessage('No workspace folder open.')
    return false
  }

  const workspaceFolder = vscode.workspace.workspaceFolders![0].uri.fsPath
  const fullPath = path.join(workspaceFolder, filePath)

  // Ensure directory exists
  const directory = path.dirname(fullPath)
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
  }

  // Create the file
  fs.writeFileSync(fullPath, content)

  // Show success message
  vscode.window.showInformationMessage(`Created new file: ${filePath}`)
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

      if (files.length === 0) {
        vscode.window.showErrorMessage(
          'No valid file content found in clipboard.'
        )
        return
      }

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Processing files',
          cancellable: true
        },
        async (progress, token) => {
          const total_files = files.length

          for (let i = 0; i < files.length; i++) {
            if (token.isCancellationRequested) {
              vscode.window.showInformationMessage('File processing cancelled.')
              return
            }

            const file = files[i]
            const progress_per_file = 100 / total_files

            progress.report({
              message: `Processing file ${i + 1}/${total_files}: ${
                file.filePath
              }`,
              increment: 0 // Start of file processing
            })

            // Check if file exists in workspace
            const file_exists = await vscode.workspace
              .findFiles(file.filePath, null, 1)
              .then((files) => files.length > 0)

            if (file_exists) {
              // File exists, open it and update with AI
              const file_uri = vscode.Uri.file(
                path.join(
                  vscode.workspace.workspaceFolders![0].uri.fsPath,
                  file.filePath
                )
              )

              try {
                const document = await vscode.workspace.openTextDocument(
                  file_uri
                )
                const document_text = document.getText()

                // Process with AI using file.content as the instruction
                const updated_content = await process_file({
                  provider,
                  filePath: file.filePath,
                  fileContent: document_text,
                  instruction: file.content,
                  system_instructions,
                  verbose: verbose || false,
                  onProgress: (receivedLength, totalLength) => {
                    // Calculate progress within the current file
                    // Cap the progress at 100% to prevent showing over 100%
                    const progress_percentage = Math.min(
                      receivedLength / totalLength,
                      1.0
                    )
                    const file_progress = progress_percentage * progress_per_file

                    progress.report({
                      message: `Processing file ${i + 1}/${total_files}: ${
                        file.filePath
                      } (${Math.min(
                        Math.round(progress_percentage * 100),
                        100
                      )}%)`,
                      increment: file_progress
                    })
                  }
                })

                if (!updated_content) {
                  continue // Skip to next file if processing failed
                }

                if (updated_content == 'rate_limit') {
                  const cancel_token_source = axios.CancelToken.source()
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
                    continue // Skip to next file
                  }

                  // Apply the fallback content
                  const editor = await vscode.window.showTextDocument(document)
                  const cleaned_content = cleanup_api_response({
                    content: fallback_content,
                    end_with_new_line: true
                  })

                  await editor.edit((edit) => {
                    edit.replace(
                      new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document_text.length)
                      ),
                      cleaned_content
                    )
                  })

                  await document.save()
                  vscode.window.showInformationMessage(
                    `Updated ${file.filePath} with fallback model.`
                  )
                } else {
                  // Apply regular changes
                  const editor = await vscode.window.showTextDocument(document)
                  await editor.edit((edit) => {
                    edit.replace(
                      new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document_text.length)
                      ),
                      updated_content
                    )
                  })

                  await document.save()
                  vscode.window.showInformationMessage(
                    `Updated ${file.filePath}`
                  )
                }
              } catch (error) {
                console.error(`Error processing file ${file.filePath}:`, error)
                vscode.window.showErrorMessage(
                  `Error processing ${file.filePath}`
                )
              }
            } else {
              // File doesn't exist, create it
              await createFileIfNeeded(file.filePath, file.content)
              progress.report({
                increment: progress_per_file // Complete progress for this file
              })
            }
          }

          vscode.window.showInformationMessage(
            `Processed ${total_files} ${total_files > 1 ? 'files' : 'file'}.`
          )
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

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Waiting for the updated file',
          cancellable: true
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            cancel_token_source.cancel('Cancelled by user.')
          })

          try {
            const refactored_content = await process_file({
              provider,
              filePath: file_path,
              fileContent: document_text,
              instruction,
              system_instructions,
              verbose: verbose || false,
              onProgress: (receivedLength, totalLength) => {
                // Calculate a percentage that will never exceed 100%
                const progressPercentage = Math.min(
                  receivedLength / totalLength,
                  1.0
                )
                const percentage = Math.round(progressPercentage * 100)

                progress.report({
                  message: `${percentage}% received...`,
                  increment: Math.min(
                    (receivedLength / totalLength) * 100,
                    100 / totalLength
                  ) // Cap increment to prevent exceeding 100%
                })
              }
            })

            if (!refactored_content) {
              vscode.window.showErrorMessage(
                'Applying changes failed. Please try again later.'
              )
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