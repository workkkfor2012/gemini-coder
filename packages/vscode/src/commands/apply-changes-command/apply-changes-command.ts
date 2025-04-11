import * as vscode from 'vscode'
import axios, { CancelToken } from 'axios'
import * as path from 'path'
import * as fs from 'fs'
import { Provider } from '../../types/provider'
import { make_api_request } from '../../helpers/make-api-request'
import { BUILT_IN_PROVIDERS } from '../../constants/built-in-providers'
import { cleanup_api_response } from '../../helpers/cleanup-api-response'
import { handle_rate_limit_fallback } from '../../helpers/handle-rate-limit-fallback'
import { ModelManager } from '../../services/model-manager'
import { apply_changes_instruction } from '../../constants/instructions'
import {
  ClipboardFile,
  parse_clipboard_multiple_files,
  is_multiple_files_clipboard
} from './utils/clipboard-parser'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '../../constants/state-keys'
import {
  sanitize_file_name,
  create_safe_path
} from '../../utils/path-sanitizer'
import { Logger } from '../../helpers/logger'
import { format_document } from './utils/format-document'

type OriginalFileState = {
  file_path: string
  content: string
  is_new: boolean
  workspace_name?: string
}

async function get_selected_provider(
  context: vscode.ExtensionContext,
  all_providers: Provider[],
  default_model_name: string | undefined
): Promise<Provider | undefined> {
  Logger.log({ function_name: 'get_selected_provider', message: 'start' })
  if (
    !default_model_name ||
    !all_providers.some((p) => p.name == default_model_name)
  ) {
    vscode.window.showErrorMessage('Default model is not set or valid.')
    Logger.warn({
      function_name: 'get_selected_provider',
      message: 'Default model is not set or valid.'
    })
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
    Logger.log({
      function_name: 'get_selected_provider',
      message: 'User cancelled provider selection.'
    })
    return undefined // User cancelled
  }

  // Determine selected model name
  const selected_model_name = selected_item.label

  const selected_provider = all_providers.find(
    (p) => p.name == selected_model_name
  )
  if (!selected_provider) {
    vscode.window.showErrorMessage(`Model "${selected_model_name}" not found.`)
    Logger.error({
      function_name: 'get_selected_provider',
      message: `Model "${selected_model_name}" not found.`
    })
    return undefined
  }

  // Update the last used models in global state
  last_used_models = [
    selected_model_name,
    ...last_used_models.filter((model) => model != selected_model_name)
  ]
  context.globalState.update('lastUsedApplyChangesModels', last_used_models)

  Logger.log({
    function_name: 'get_selected_provider',
    message: 'Selected provider',
    data: selected_provider.name
  })
  return selected_provider
}

// Removed format_document function from here

/**
 * Process a single file with AI and apply changes
 */
async function process_file(params: {
  provider: Provider
  file_path: string
  file_content: string
  instruction: string
  system_instructions?: string
  cancel_token?: CancelToken // Add cancelToken parameter
  on_progress?: (chunkLength: number, totalLength: number) => void
}): Promise<string | null> {
  Logger.log({
    function_name: 'process_file',
    message: 'start',
    data: { file_path: params.file_path, provider: params.provider.name }
  })
  const apply_changes_prompt = `${apply_changes_instruction} ${params.instruction}`
  const file_content = `<file name="${params.file_path}">\n<![CDATA[\n${params.file_content}\n]]>\n</file>\n`
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

  Logger.log({
    function_name: 'process_file',
    message: 'API Request Body',
    data: body
  })

  try {
    const total_length = params.file_content.length
    let received_length = 0

    const refactored_content = await make_api_request(
      params.provider,
      body,
      params.cancel_token,
      (chunk: string) => {
        received_length += chunk.length
        if (params.on_progress) {
          params.on_progress(received_length, total_length)
        }
      }
    )

    if (!refactored_content) {
      if (axios.isCancel(params.cancel_token?.reason)) {
        Logger.log({
          function_name: 'process_file',
          message: 'Request cancelled',
          data: params.file_path
        })
        return null // Silent cancellation
      }
      vscode.window.showErrorMessage(
        `Applying changes to ${params.file_path} failed. Please try again later.`
      )
      Logger.error({
        function_name: 'process_file',
        message: 'API request failed',
        data: params.file_path
      })
      return null
    } else if (refactored_content == 'rate_limit') {
      Logger.warn({
        function_name: 'process_file',
        message: 'Rate limit reached',
        data: params.file_path
      })
      return 'rate_limit'
    }

    const cleaned_content = cleanup_api_response({
      content: refactored_content
    })
    Logger.log({
      function_name: 'process_file',
      message: 'API response received and cleaned',
      data: {
        file_path: params.file_path,
        response_length: cleaned_content?.length
      }
    })
    return cleaned_content
  } catch (error: any) {
    // First check for cancellation
    if (axios.isCancel(error)) {
      Logger.log({
        function_name: 'process_file',
        message: 'Request cancelled',
        data: params.file_path
      })
      return null // Silent cancellation
    }

    // For other errors, show the error message as before
    Logger.error({
      function_name: 'process_file',
      message: 'Refactoring error',
      data: { error, file_path: params.file_path }
    })
    console.error(`Refactoring error for ${params.file_path}:`, error)
    vscode.window.showErrorMessage(
      `An error occurred during refactoring ${params.file_path}. See console for details.`
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
  Logger.log({
    function_name: 'create_file_if_needed',
    message: 'start',
    data: filePath
  })
  // Check if we have a workspace folder
  if (vscode.workspace.workspaceFolders?.length == 0) {
    vscode.window.showErrorMessage('No workspace folder open.')
    Logger.warn({
      function_name: 'create_file_if_needed',
      message: 'No workspace folder open.'
    })
    return false
  }

  const workspace_folder = vscode.workspace.workspaceFolders![0].uri.fsPath

  const safe_path = create_safe_path(workspace_folder, filePath)

  if (!safe_path) {
    vscode.window.showErrorMessage(
      `Invalid file path: ${filePath}. Path may contain traversal attempts.`
    )
    Logger.error({
      function_name: 'create_file_if_needed',
      message: 'Invalid file path',
      data: filePath
    })
    return false
  }

  // Ensure directory exists
  const directory = path.dirname(safe_path)
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
    Logger.log({
      function_name: 'create_file_if_needed',
      message: 'Directory created',
      data: directory
    })
  }

  // Create the file
  fs.writeFileSync(safe_path, content)
  Logger.log({
    function_name: 'create_file_if_needed',
    message: 'File created',
    data: safe_path
  })

  // Open the file in editor
  const document = await vscode.workspace.openTextDocument(safe_path)
  await vscode.window.showTextDocument(document)

  await format_document(document)
  await document.save()
  Logger.log({
    function_name: 'create_file_if_needed',
    message: 'File created, formatted and saved',
    data: safe_path
  })

  return true
}

/**
 * Replace files directly without AI processing
 */
async function replace_files_directly(
  files: ClipboardFile[]
): Promise<{ success: boolean; original_states?: OriginalFileState[] }> {
  Logger.log({
    function_name: 'replace_files_directly',
    message: 'start',
    data: { file_count: files.length }
  })
  try {
    const new_files: ClipboardFile[] = []
    const existing_files: ClipboardFile[] = []
    const safe_files: ClipboardFile[] = []
    const unsafe_files: string[] = []

    if (vscode.workspace.workspaceFolders?.length == 0) {
      vscode.window.showErrorMessage('No workspace folder open.')
      Logger.warn({
        function_name: 'replace_files_directly',
        message: 'No workspace folder open.'
      })
      return { success: false }
    }

    // Create a map of workspace names to their root paths
    const workspace_map = new Map<string, string>()
    vscode.workspace.workspaceFolders!.forEach((folder) => {
      workspace_map.set(folder.name, folder.uri.fsPath)
    })

    // Default workspace is the first one
    const default_workspace = vscode.workspace.workspaceFolders![0].uri.fsPath

    // First validate all file paths
    for (const file of files) {
      // Determine the correct workspace root
      let workspace_root = default_workspace
      if (file.workspace_name) {
        workspace_root =
          workspace_map.get(file.workspace_name) || default_workspace
      }

      const sanitized_path = sanitize_file_name(file.file_path)

      // Check if the path would be safe
      if (create_safe_path(workspace_root, sanitized_path)) {
        safe_files.push({
          ...file,
          file_path: sanitized_path // Use sanitized path
        })
      } else {
        unsafe_files.push(file.file_path)
        Logger.warn({
          function_name: 'replace_files_directly',
          message: 'Unsafe file path detected',
          data: file.file_path
        })
      }
    }

    // Rest of safety checks and user warnings...
    if (unsafe_files.length > 0) {
      const unsafe_list = unsafe_files.join('\n')
      vscode.window.showErrorMessage(
        `Detected ${unsafe_files.length} unsafe file path(s) that may attempt directory traversal:\n${unsafe_list}\n\nThese files will be skipped.`
      )
      Logger.warn({
        function_name: 'replace_files_directly',
        message: 'Unsafe file paths detected and skipped',
        data: unsafe_files
      })

      if (safe_files.length == 0) {
        return { success: false }
      }
    }

    // Check existence for each file in its correct workspace
    for (const file of safe_files) {
      // Get the correct workspace root for this file
      let workspace_root = default_workspace
      if (file.workspace_name) {
        workspace_root =
          workspace_map.get(file.workspace_name) || default_workspace
      }

      // Create full path using the correct workspace root
      const full_path = path.normalize(
        path.join(workspace_root, file.file_path)
      )

      if (fs.existsSync(full_path)) {
        existing_files.push(file)
      } else {
        new_files.push(file)
      }
    }

    // If there are new files, ask for confirmation before proceeding
    if (new_files.length > 0) {
      const new_file_list = new_files.map((file) => file.file_path).join('\n')
      const confirmation = await vscode.window.showWarningMessage(
        `This will create ${new_files.length} new ${
          new_files.length == 1 ? 'file' : 'files'
        }:\n${new_file_list}\n\nDo you want to continue?`,
        { modal: true },
        'Yes'
      )

      if (confirmation != 'Yes') {
        vscode.window.showInformationMessage(
          'Operation cancelled. No files were modified.'
        )
        Logger.log({
          function_name: 'replace_files_directly',
          message: 'User cancelled new file creation.'
        })
        return { success: false }
      }
      Logger.log({
        function_name: 'replace_files_directly',
        message: 'User confirmed new file creation.'
      })
    }

    // Store original file states for reversion
    const original_states: OriginalFileState[] = []

    // Apply changes to all files
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Replacing files',
        cancellable: true
      },
      async (progress, token) => {
        let processed_count = 0
        const total_count = safe_files.length

        for (const file of safe_files) {
          if (token.isCancellationRequested) {
            vscode.window.showInformationMessage('Operation cancelled by user.')
            Logger.log({
              function_name: 'replace_files_directly',
              message: 'Operation cancelled by user during file processing.'
            })
            return false
          }

          // Get the correct workspace root for this file
          let workspace_root = default_workspace
          if (file.workspace_name) {
            workspace_root =
              workspace_map.get(file.workspace_name) || default_workspace
          }

          // Create safe path using the correct workspace root
          const safe_path = create_safe_path(workspace_root, file.file_path)

          if (!safe_path) {
            Logger.error({
              function_name: 'replace_files_directly',
              message: 'Path validation failed',
              data: file.file_path
            })
            console.error(`Path validation failed for: ${file.file_path}`)
            continue
          }

          const file_exists = fs.existsSync(safe_path)

          if (file_exists) {
            // Store original content for reversion
            const file_uri = vscode.Uri.file(safe_path)
            const document = await vscode.workspace.openTextDocument(file_uri)
            original_states.push({
              file_path: file.file_path,
              content: document.getText(),
              is_new: false,
              workspace_name: file.workspace_name
            })

            // Replace existing file
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

            await format_document(document)
            await document.save()
            Logger.log({
              function_name: 'replace_files_directly',
              message: 'Existing file replaced and saved',
              data: safe_path
            })
          } else {
            // Mark as new file for reversion
            original_states.push({
              file_path: file.file_path,
              content: '',
              is_new: true,
              workspace_name: file.workspace_name
            })

            // Create new file in correct workspace
            // Ensure directory exists
            const directory = path.dirname(safe_path)
            if (!fs.existsSync(directory)) {
              fs.mkdirSync(directory, { recursive: true })
              Logger.log({
                function_name: 'replace_files_directly',
                message: 'Directory created',
                data: directory
              })
            }

            // Create the file
            fs.writeFileSync(safe_path, file.content)
            Logger.log({
              function_name: 'replace_files_directly',
              message: 'New file created',
              data: safe_path
            })

            // Open and format the file
            const document = await vscode.workspace.openTextDocument(safe_path)
            await vscode.window.showTextDocument(document)
            await format_document(document)
            await document.save()
            Logger.log({
              function_name: 'replace_files_directly',
              message: 'New file created, formatted and saved',
              data: safe_path
            })
          }

          processed_count++
          progress.report({
            message: `${processed_count}/${total_count} files processed`,
            increment: (1 / total_count) * 100
          })
        }

        return true
      }
    )

    if (result) {
      Logger.log({
        function_name: 'replace_files_directly',
        message: 'Files replaced successfully',
        data: { file_count: safe_files.length }
      })
      return { success: true, original_states }
    } else {
      Logger.log({
        function_name: 'replace_files_directly',
        message: 'File replacement failed or cancelled'
      })
      return { success: false }
    }
  } catch (error: any) {
    Logger.error({
      function_name: 'replace_files_directly',
      message: 'Error during direct file replacement',
      data: error
    })
    console.error('Error during direct file replacement:', error)
    vscode.window.showErrorMessage(
      `An error occurred while replacing files: ${
        error.message || 'Unknown error'
      }`
    )
    return { success: false }
  }
}

async function revert_files(
  original_states: OriginalFileState[]
): Promise<boolean> {
  Logger.log({
    function_name: 'revert_files',
    message: 'start',
    data: { original_states_count: original_states.length }
  })
  try {
    if (vscode.workspace.workspaceFolders?.length == 0) {
      vscode.window.showErrorMessage('No workspace folder open.')
      Logger.warn({
        function_name: 'revert_files',
        message: 'No workspace folder open.'
      })
      return false
    }

    // Create a map of workspace names to their root paths
    const workspace_map = new Map<string, string>()
    vscode.workspace.workspaceFolders!.forEach((folder) => {
      workspace_map.set(folder.name, folder.uri.fsPath)
    })

    // Default workspace is the first one
    const default_workspace = vscode.workspace.workspaceFolders![0].uri.fsPath

    for (const state of original_states) {
      // Determine the correct workspace root for this file
      let workspace_root = default_workspace
      if (state.workspace_name) {
        workspace_root =
          workspace_map.get(state.workspace_name) || default_workspace
      }

      // Validate the file path for reversion
      const safe_path = create_safe_path(workspace_root, state.file_path)

      if (!safe_path) {
        Logger.error({
          function_name: 'revert_files',
          message: 'Cannot revert file with unsafe path',
          data: state.file_path
        })
        console.error(`Cannot revert file with unsafe path: ${state.file_path}`)
        continue
      }

      // For new files that were created, delete them
      if (state.is_new) {
        if (fs.existsSync(safe_path)) {
          // Close any editors with the file open
          const uri = vscode.Uri.file(safe_path)
          // Try to close the editor if it's open
          const text_editors = vscode.window.visibleTextEditors.filter(
            (editor) => editor.document.uri.toString() == uri.toString()
          )
          for (const editor of text_editors) {
            await vscode.window.showTextDocument(editor.document, {
              preview: false,
              preserveFocus: false
            })
            await vscode.commands.executeCommand(
              'workbench.action.closeActiveEditor'
            )
          }

          // Delete the file
          fs.unlinkSync(safe_path)
          Logger.log({
            function_name: 'revert_files',
            message: 'New file deleted',
            data: safe_path
          })
        }
      } else {
        // For existing files that were modified, restore original content
        const file_uri = vscode.Uri.file(safe_path)

        try {
          const document = await vscode.workspace.openTextDocument(file_uri)
          const editor = await vscode.window.showTextDocument(document)
          await editor.edit((edit) => {
            edit.replace(
              new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
              ),
              state.content
            )
          })
          await document.save()
          Logger.log({
            function_name: 'revert_files',
            message: 'Existing file reverted to original content',
            data: safe_path
          })
        } catch (err) {
          Logger.warn({
            function_name: 'revert_files',
            message: 'Error reverting file',
            data: { error: err, file_path: state.file_path }
          })
          console.error(`Error reverting file ${state.file_path}:`, err)
          vscode.window.showWarningMessage(
            `Could not revert file: ${state.file_path}. It might have been closed or deleted.`
          )
        }
      }
    }

    vscode.window.showInformationMessage('Changes successfully reverted.')
    Logger.log({
      function_name: 'revert_files',
      message: 'Changes successfully reverted.'
    })
    return true
  } catch (error: any) {
    Logger.error({
      function_name: 'revert_files',
      message: 'Error during reversion',
      data: error
    })
    console.error('Error during reversion:', error)
    vscode.window.showErrorMessage(
      `Failed to revert changes: ${error.message || 'Unknown error'}`
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
  mode?: 'Fast replace' | 'Intelligent update'
}) {
  const model_manager = new ModelManager(params.context)

  return vscode.commands.registerCommand(params.command, async () => {
    Logger.log({
      function_name: 'apply_changes_command',
      message: 'start',
      data: { command: params.command, mode: params.mode }
    })
    const config = vscode.workspace.getConfiguration()
    const clipboard_text = await vscode.env.clipboard.readText()

    if (!clipboard_text) {
      vscode.window.showErrorMessage('Clipboard is empty.')
      Logger.warn({
        function_name: 'apply_changes_command',
        message: 'Clipboard is empty.'
      })
      return
    }

    // Check if workspace has only one root folder
    const is_single_root_folder_workspace =
      vscode.workspace.workspaceFolders?.length == 1

    // Check if clipboard contains multiple files
    const is_multiple_files = is_multiple_files_clipboard(clipboard_text)

    const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
    const gemini_api_key = config.get<string>('geminiCoder.apiKey')
    const gemini_temperature = config.get<number>('geminiCoder.temperature')
    const max_concurrency = 10

    // Modify the default mode selection to respect forced mode
    const default_apply_changes_mode =
      params.mode ||
      config.get<string>('geminiCoder.defaultApplyChangesMode') ||
      'Always ask'

    // Get default model from global state instead of config
    const default_model_name = model_manager.get_default_apply_changes_model()

    const all_providers = [
      ...BUILT_IN_PROVIDERS.map((provider) => ({
        ...provider,
        apiKey: gemini_api_key || '',
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
        Logger.warn({
          function_name: 'apply_changes_command',
          message: 'Default apply changes model is not set or invalid.'
        })
        return
      }
      Logger.log({
        function_name: 'apply_changes_command',
        message: 'Using default model',
        data: default_model_name
      })
    } else {
      provider = await get_selected_provider(
        params.context,
        all_providers,
        default_model_name
      )
      if (provider) {
        Logger.log({
          function_name: 'apply_changes_command',
          message: 'Selected provider',
          data: provider.name
        })
      }
    }

    if (!provider) {
      return // Provider selection failed or was cancelled
    }

    let selected_mode_label: string | undefined = undefined

    // Handle multiple files case - check if we should use Fast Replace first
    if (is_multiple_files) {
      if (params.mode) {
        selected_mode_label = params.mode
        Logger.log({
          function_name: 'apply_changes_command',
          message: 'Mode forced by params',
          data: selected_mode_label
        })
      } else {
        // Determine if we need to ask the user for the mode
        const should_ask_for_mode =
          params.command == 'geminiCoder.applyChangesWith' || // Always ask for 'applyChangesWith'
          (params.command == 'geminiCoder.applyChanges' && // Ask for 'applyChanges' only if setting is 'Always ask'
            default_apply_changes_mode == 'Always ask')

        if (should_ask_for_mode) {
          // Modify the mode_options creation to put last used option on top
          const last_used_mode = params.context.globalState.get<string>(
            'lastUsedApplyChangesMode'
          )
          const mode_options = []

          // Define all available modes
          const all_modes = [
            {
              label: 'Intelligent update',
              description: 'Use AI to apply shortened files or diffs'
            },
            {
              label: 'Fast replace',
              description: 'Suitable if files are in a "whole" format'
            }
          ]

          // If there's a last used mode, put it first
          if (last_used_mode) {
            const last_used_mode_option = all_modes.find(
              (mode) => mode.label == last_used_mode
            )
            if (last_used_mode_option) {
              mode_options.push({
                ...last_used_mode_option,
                description: `${last_used_mode_option.description} (Last used)`
              })

              // Add the rest of the modes
              mode_options.push(
                ...all_modes.filter((mode) => mode.label != last_used_mode)
              )
            } else {
              mode_options.push(...all_modes)
            }
          } else {
            // No last used mode, use the default order
            mode_options.push(...all_modes)
          }

          const selected_mode = await vscode.window.showQuickPick(
            mode_options,
            {
              placeHolder: 'Choose how to apply changes'
            }
          )

          if (!selected_mode) {
            Logger.log({
              function_name: 'apply_changes_command',
              message: 'User cancelled mode selection.'
            })
            return // User cancelled
          }
          selected_mode_label = selected_mode.label

          // Add this after selecting the mode
          if (selected_mode) {
            // Store the last used mode in global state
            params.context.globalState.update(
              'lastUsedApplyChangesMode',
              selected_mode.label
            )
            Logger.log({
              function_name: 'apply_changes_command',
              message: 'Mode selected by user',
              data: selected_mode_label
            })
          }
        } else {
          // Use the default mode if not asking
          selected_mode_label = default_apply_changes_mode
          Logger.log({
            function_name: 'apply_changes_command',
            message: 'Using default mode',
            data: selected_mode_label
          })
        }
      }

      // Handle Fast replace mode - we don't need the bearer token for this
      if (selected_mode_label == 'Fast replace') {
        const files = parse_clipboard_multiple_files({
          clipboard_text,
          is_single_root_folder_workspace
        })
        const result = await replace_files_directly(files)

        if (result.success && result.original_states) {
          params.context.workspaceState.update(
            LAST_APPLIED_CHANGES_STATE_KEY,
            result.original_states
          )

          const total_files = files.length
          const response = await vscode.window.showInformationMessage(
            `Successfully replaced ${total_files} ${
              total_files > 1 ? 'files' : 'file'
            }.`,
            'Revert'
          )

          if (response == 'Revert') {
            await revert_files(result.original_states)
            params.context.workspaceState.update(
              LAST_APPLIED_CHANGES_STATE_KEY,
              null
            )
          }
        }
        Logger.log({
          function_name: 'apply_changes_command',
          message: 'Fast replace mode completed',
          data: { success: result.success, file_count: files.length }
        })
        return // Exit after fast replace
      }
      // If not 'Fast replace', it must be 'Intelligent update', continue below
    }

    // At this point we need the bearer token for AI processing (Intelligent update or single file)
    if (!provider.apiKey) {
      vscode.window.showErrorMessage(
        'API key is missing. Please add it in the settings.'
      )
      Logger.warn({
        function_name: 'apply_changes_command',
        message: 'API key is missing for provider',
        data: provider.name
      })
      return
    }

    const system_instructions = provider.systemInstructions

    if (is_multiple_files) {
      Logger.log({
        function_name: 'apply_changes_command',
        message: 'Processing multiple files in Intelligent update mode'
      })
      // Handle multiple files with AI processing ('Intelligent update' mode)
      const raw_files = parse_clipboard_multiple_files({
        clipboard_text,
        is_single_root_folder_workspace
      })

      // Sanitize file paths in the parsed files
      const workspace_folder = vscode.workspace.workspaceFolders![0].uri.fsPath
      const files: ClipboardFile[] = []
      const skipped_files: string[] = []

      for (const file of raw_files) {
        // Sanitize and validate the file path
        const sanitized_path = sanitize_file_name(file.file_path)

        // Check if the path would be safe
        if (create_safe_path(workspace_folder, sanitized_path)) {
          files.push({
            ...file,
            file_path: sanitized_path // Use sanitized path
          })
        } else {
          skipped_files.push(file.file_path)
          Logger.warn({
            function_name: 'apply_changes_command',
            message: 'Unsafe file path detected in multi-file mode',
            data: file.file_path
          })
        }
      }

      // Show warning if unsafe paths were detected
      if (skipped_files.length > 0) {
        const skipped_list = skipped_files.join('\n')
        vscode.window.showErrorMessage(
          `Detected ${skipped_files.length} unsafe file path(s) that may attempt directory traversal:\n${skipped_list}\n\nThese files will be skipped.`
        )
        Logger.warn({
          function_name: 'apply_changes_command',
          message: 'Unsafe file paths skipped in multi-file mode',
          data: skipped_files
        })

        if (files.length === 0) {
          return
        }
      }

      if (files.length == 0) {
        vscode.window.showErrorMessage(
          'No valid file content found in clipboard.'
        )
        Logger.warn({
          function_name: 'apply_changes_command',
          message:
            'No valid file content found in clipboard for multi-file mode.'
        })
        return
      }

      const total_files = files.length

      // First, identify which files are new (don't exist in workspace)
      const new_files: ClipboardFile[] = []
      const existing_files: ClipboardFile[] = []

      for (const file of files) {
        // Check if file exists in workspace
        let file_exists = false

        if (file.workspace_name) {
          // If we have workspace info, find the matching workspace and check in that specific workspace
          const matching_workspace = vscode.workspace.workspaceFolders?.find(
            (folder) => folder.name == file.workspace_name
          )

          if (matching_workspace) {
            // Create a full path with the proper workspace root
            const full_path = path.normalize(
              path.join(matching_workspace.uri.fsPath, file.file_path)
            )
            file_exists = fs.existsSync(full_path)
          }
        } else {
          // Fall back to checking across all workspaces if no workspace name is specified
          file_exists = await vscode.workspace
            .findFiles(file.file_path, null, 1)
            .then((files) => files.length > 0)
        }

        if (file_exists) {
          existing_files.push(file)
        } else {
          new_files.push(file)
        }
      }

      // If there are new files, ask for confirmation before proceeding
      if (new_files.length > 0) {
        const new_file_list = new_files.map((file) => file.file_path).join('\n')
        const confirmation = await vscode.window.showWarningMessage(
          `This will create ${new_files.length} new ${
            new_files.length == 1 ? 'file' : 'files'
          }:\n${new_file_list}\n\nDo you want to continue?`,
          { modal: true },
          'Yes'
        )

        if (confirmation != 'Yes') {
          vscode.window.showInformationMessage(
            'Operation cancelled. No files were modified.'
          )
          Logger.log({
            function_name: 'apply_changes_command',
            message: 'User cancelled new file creation in multi-file mode.'
          })
          return
        }
        Logger.log({
          function_name: 'apply_changes_command',
          message: 'User confirmed new file creation in multi-file mode.'
        })
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
            ? `Waiting for ${existing_files.length} updated files...`
            : 'Waiting for the updated file...'
      } else {
        // Only creating new files
        progress_title = `Creating ${new_files.length} new file${
          new_files.length > 1 ? 's' : ''
        }`
      }

      // Store original file states for reversion
      const original_states: OriginalFileState[] = []

      vscode.window
        .withProgress(
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

            try {
              // Find largest existing file to track
              for (const file of existing_files) {
                try {
                  // Create safe path for file operations
                  const safe_path = create_safe_path(
                    workspace_folder,
                    file.file_path
                  )

                  if (!safe_path) {
                    Logger.error({
                      function_name: 'apply_changes_command',
                      message:
                        'Path validation failed in multi-file processing',
                      data: file.file_path
                    })
                    console.error(
                      `Path validation failed for: ${file.file_path}`
                    )
                    continue
                  }

                  const file_uri = vscode.Uri.file(safe_path)
                  const document = await vscode.workspace.openTextDocument(
                    file_uri
                  )

                  // Store original file state for potential reversion
                  original_states.push({
                    file_path: file.file_path,
                    content: document.getText(),
                    is_new: false,
                    workspace_name: file.workspace_name
                  })

                  const content_size = document.getText().length

                  if (!largest_file || content_size > largest_file.size) {
                    largest_file = {
                      path: file.file_path,
                      size: content_size
                    }
                  }
                } catch (error) {
                  Logger.warn({
                    function_name: 'apply_changes_command',
                    message:
                      'Error checking file size in multi-file processing',
                    data: { error, file_path: file.file_path }
                  })
                  console.log(
                    `Error checking file size for ${file.file_path}`,
                    error
                  )
                }
              }

              // Mark new files for reversion tracking
              for (const file of new_files) {
                original_states.push({
                  file_path: file.file_path,
                  content: '',
                  is_new: true,
                  workspace_name: file.workspace_name
                })
              }

              // Process all files in parallel batches
              for (let i = 0; i < files.length; i += max_concurrency) {
                if (token.isCancellationRequested) {
                  Logger.log({
                    function_name: 'apply_changes_command',
                    message:
                      'Operation cancelled during multi-file processing batch.',
                    data: { batch_start_index: i }
                  })
                  return
                }

                const batch = files.slice(i, i + max_concurrency)

                // Create an array to hold the promises for this batch
                const promises = batch.map(async (file) => {
                  try {
                    // Check if file exists in workspace
                    let file_exists = false
                    if (file.workspace_name) {
                      // Find matching workspace folder by name
                      const matching_workspace =
                        vscode.workspace.workspaceFolders?.find(
                          (folder) => folder.name == file.workspace_name
                        )

                      if (matching_workspace) {
                        const full_path = path.normalize(
                          path.join(
                            matching_workspace.uri.fsPath,
                            file.file_path
                          )
                        )
                        file_exists = fs.existsSync(full_path)
                      }
                    } else {
                      file_exists = await vscode.workspace
                        .findFiles(file.file_path, null, 1)
                        .then((files) => files.length > 0)
                    }

                    // For new files, just store the information for creation later
                    if (!file_exists) {
                      return {
                        document: null,
                        content: file.content,
                        isNew: true,
                        filePath: file.file_path
                      }
                    }

                    // Create safe path for file operations
                    const safe_path = create_safe_path(
                      workspace_folder,
                      file.file_path
                    )

                    if (!safe_path) {
                      Logger.error({
                        function_name: 'apply_changes_command',
                        message:
                          'Path validation failed during batch processing',
                        data: file.file_path
                      })
                      console.error(
                        `Path validation failed for: ${file.file_path}`
                      )
                      throw new Error(`Invalid file path: ${file.file_path}`)
                    }

                    const file_uri = vscode.Uri.file(safe_path)

                    const document = await vscode.workspace.openTextDocument(
                      file_uri
                    )
                    const document_text = document.getText()

                    // Process the file content with AI
                    const updated_content = await process_file({
                      provider,
                      file_path: file.file_path,
                      file_content: document_text,
                      instruction: file.content,
                      system_instructions,
                      cancel_token: cancel_token_source.token,
                      on_progress: (receivedLength, totalLength) => {
                        // Only update progress if this is the largest file
                        if (
                          largest_file &&
                          file.file_path == largest_file.path
                        ) {
                          previous_largest_file_progress = largest_file_progress
                          largest_file_progress = Math.min(
                            Math.round((receivedLength / totalLength) * 100),
                            100
                          )

                          // Calculate the increment since last update
                          const increment =
                            largest_file_progress -
                            previous_largest_file_progress

                          progress.report({
                            increment: increment > 0 ? increment : 0
                          })
                        }
                      }
                    })

                    if (!updated_content) {
                      if (token.isCancellationRequested) {
                        throw new Error('Operation cancelled')
                      }
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
                          content: fallback_content
                        }),
                        isNew: false,
                        filePath: file.file_path
                      }
                    } else {
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
                        content: updated_content,
                        isNew: false,
                        filePath: file.file_path
                      }
                    }
                  } catch (error: any) {
                    // Re-throw the error to be caught by the Promise.all
                    if (
                      token.isCancellationRequested ||
                      error.message == 'Operation cancelled' ||
                      axios.isCancel(error)
                    ) {
                      throw new Error('Operation cancelled')
                    } else {
                      Logger.error({
                        function_name: 'apply_changes_command',
                        message: 'Error processing file in batch',
                        data: { error, file_path: file.file_path }
                      })
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

                await format_document(document)
                await document.save()
              }

              // Return true to complete the progress
              return true
            } catch (error: any) {
              // If any file processing fails, cancel the entire operation
              cancel_token_source.cancel('Operation failed')
              Logger.error({
                function_name: 'apply_changes_command',
                message: 'Multi-file processing failed',
                data: error
              })

              // Check for cancellation or cancellation-related errors
              if (
                error.message == 'Operation cancelled' ||
                axios.isCancel(error) ||
                error.message?.includes('Failed to apply changes')
              ) {
                // Silent cancellation - no error message needed
                return false
              }

              // Show error message only for other types of errors
              vscode.window.showErrorMessage(
                `An error occurred during processing: ${error.message}`
              )
              return false // Indicate failure
            }
          }
        )
        .then((result) => {
          // Only show success message after the progress is complete and successful
          if (result === true) {
            // Store the original states in workspace state for later reversion
            params.context.workspaceState.update(
              LAST_APPLIED_CHANGES_STATE_KEY,
              original_states
            )

            // If result is true, the operation completed successfully
            vscode.window
              .showInformationMessage(
                `Successfully updated ${total_files} ${
                  total_files > 1 ? 'files' : 'file'
                }.`,
                'Revert'
              )
              .then((response) => {
                if (response == 'Revert') {
                  revert_files(original_states)
                  params.context.workspaceState.update(
                    LAST_APPLIED_CHANGES_STATE_KEY,
                    null
                  )
                }
              })
            Logger.log({
              function_name: 'apply_changes_command',
              message: 'Multi-file processing completed successfully',
              data: { file_count: total_files }
            })
          } else {
            Logger.log({
              function_name: 'apply_changes_command',
              message: 'Multi-file processing was not successful.'
            })
          }
        })
    } else {
      Logger.log({
        function_name: 'apply_changes_command',
        message: 'Processing single file in Intelligent update mode'
      })
      // Single file
      const editor = vscode.window.activeTextEditor

      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.')
        Logger.warn({
          function_name: 'apply_changes_command',
          message: 'No active editor found for single file mode.'
        })
        return
      }

      const document = editor.document
      const document_text = document.getText()
      const instruction = clipboard_text
      const file_path = vscode.workspace.asRelativePath(document.uri)

      // Store original content for potential reversion
      const original_content = document_text

      const cancel_token_source = axios.CancelToken.source()
      // Track previous length for progress calculation
      let previous_length = 0

      // Variables to hold processing results outside the progress scope
      let result_content = ''
      let success = false

      await vscode.window
        .withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Waiting for the updated file...',
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
                file_path: file_path,
                file_content: document_text,
                instruction,
                system_instructions,
                cancel_token: cancel_token_source.token, // Pass the cancelToken
                on_progress: (receivedLength, totalLength) => {
                  // Calculate actual increment since last progress report
                  const actual_increment = receivedLength - previous_length
                  previous_length = receivedLength

                  // Calculate actual increment as percentage
                  const increment_percentage =
                    (actual_increment / totalLength) * 100

                  progress.report({
                    increment: increment_percentage
                  })
                }
              })

              if (token.isCancellationRequested) {
                Logger.log({
                  function_name: 'apply_changes_command',
                  message: 'Single file processing cancelled by user.'
                })
                return
              }

              if (!refactored_content) {
                // If process_file returns null, it could be due to cancellation or an error
                // Since we've already handled cancellation, we only show an error for non-cancellation cases
                if (!token.isCancellationRequested) {
                  vscode.window.showErrorMessage(
                    'Applying changes failed. Please try again later.'
                  )
                  Logger.error({
                    function_name: 'apply_changes_command',
                    message:
                      'Single file processing failed (process_file returned null).'
                  })
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
                  Logger.error({
                    function_name: 'apply_changes_command',
                    message:
                      'Single file processing failed - rate limit fallback failed.'
                  })
                  return
                }

                // Store the cleaned content for use after progress completes
                result_content = cleanup_api_response({
                  content: fallback_content
                })
                success = true
                Logger.log({
                  function_name: 'apply_changes_command',
                  message:
                    'Single file processing recovered from rate limit using fallback.'
                })
              } else {
                // Store the cleaned content for use after progress completes
                result_content = cleanup_api_response({
                  content: refactored_content
                })
                success = true
                Logger.log({
                  function_name: 'apply_changes_command',
                  message: 'Single file processing successful.'
                })
              }
            } catch (error) {
              if (axios.isCancel(error)) {
                Logger.log({
                  function_name: 'apply_changes_command',
                  message: 'Single file processing cancelled by axios.'
                })
                return // Silently return on cancellation
              }
              Logger.error({
                function_name: 'apply_changes_command',
                message: 'Single file refactoring error',
                data: error
              })
              console.error('Refactoring error:', error)
              vscode.window.showErrorMessage(
                'An error occurred during refactoring. See console for details.'
              )
            }
          }
        )
        .then(async () => {
          // Only proceed if we have successful results
          if (success && result_content) {
            // Apply changes after progress is complete
            const full_range = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document_text.length)
            )

            await editor.edit((edit_builder) => {
              edit_builder.replace(full_range, result_content)
            })

            await format_document(document)
            await document.save()

            // Store original file state for potential reversion
            await params.context.workspaceState.update(
              LAST_APPLIED_CHANGES_STATE_KEY,
              [
                {
                  file_path: file_path,
                  content: original_content,
                  is_new: false
                }
              ]
            )

            // Show success message with Revert option
            const response = await vscode.window.showInformationMessage(
              'Changes have been applied!',
              'Revert'
            )

            if (response == 'Revert') {
              // Revert single file changes
              await editor.edit((editBuilder) => {
                const full_range = new vscode.Range(
                  document.positionAt(0),
                  document.positionAt(document.getText().length)
                )
                editBuilder.replace(full_range, original_content)
              })
              await document.save()
              vscode.window.showInformationMessage(
                'Changes reverted successfully.'
              )
              await params.context.workspaceState.update(
                LAST_APPLIED_CHANGES_STATE_KEY,
                null
              )
              Logger.log({
                function_name: 'apply_changes_command',
                message: 'Single file changes reverted successfully.'
              })
            } else {
              Logger.log({
                function_name: 'apply_changes_command',
                message: 'Single file changes applied and saved.'
              })
            }
          } else {
            Logger.log({
              function_name: 'apply_changes_command',
              message:
                'Single file processing was not successful or no content to apply.'
            })
          }
        })
    }
    Logger.log({
      function_name: 'apply_changes_command',
      message: 'end',
      data: { command: params.command, mode: params.mode }
    })
  })
}
