import * as vscode from 'vscode'
import * as fs from 'fs'
import { Provider } from '../../types/provider'
import { BUILT_IN_PROVIDERS } from '../../constants/built-in-providers'
import { ModelManager } from '../../services/model-manager'
import {
  parse_clipboard_multiple_files,
  is_multiple_files_clipboard,
  ClipboardFile
} from './utils/clipboard-parser'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '../../constants/state-keys'
import { Logger } from '../../helpers/logger'
import { OriginalFileState } from '../../types/common'
import { revert_files } from './utils/file-operations'
import { handle_fast_replace } from './handlers/fast-replace-handler'
import { handle_intelligent_update } from './handlers/intelligent-update-handler'
import { create_safe_path } from '@/utils/path-sanitizer'
import { check_for_truncated_fragments } from '@/utils/check-for-truncated-fragments'
import { check_for_diff_markers } from '@/utils/check-for-diff-markers'

async function get_selected_provider(
  context: vscode.ExtensionContext,
  all_providers: Provider[],
  default_model_name: string | undefined
): Promise<Provider | undefined> {
  Logger.log({ function_name: 'get_selected_provider', message: 'start' })
  // Ensure default model exists if provided
  if (
    default_model_name &&
    !all_providers.some((p) => p.name == default_model_name)
  ) {
    vscode.window.showWarningMessage(
      `Default model "${default_model_name}" not found. Please check settings.`
    )
    Logger.warn({
      function_name: 'get_selected_provider',
      message: `Default model "${default_model_name}" not found.`
    })
    default_model_name = undefined // Unset default if invalid
  }

  // Get the last used models from global state
  let last_used_models = context.globalState.get<string[]>(
    'lastUsedApplyChangesModels',
    []
  )

  // Filter out invalid or non-existent models from last used
  last_used_models = last_used_models.filter((model_name) =>
    all_providers.some((p) => p.name == model_name)
  )

  // Filter out the default model from last used models if it exists
  if (default_model_name) {
    last_used_models = last_used_models.filter(
      (model) => model != default_model_name
    )
  }

  // Construct the QuickPick items
  const quick_pick_items: vscode.QuickPickItem[] = []

  // Add default model first if it exists
  if (default_model_name) {
    quick_pick_items.push({
      label: default_model_name,
      description: 'Currently set as default'
    })
  }

  // Add last used models next
  quick_pick_items.push(
    ...last_used_models.map((model_name) => ({ label: model_name }))
  )

  // Add remaining providers, excluding default and last used
  const remaining_providers = all_providers.filter(
    (p) => p.name !== default_model_name && !last_used_models.includes(p.name)
  )
  quick_pick_items.push(...remaining_providers.map((p) => ({ label: p.name })))

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
  // This check should ideally not fail due to how items are constructed, but good for safety
  if (!selected_provider) {
    vscode.window.showErrorMessage(
      `Model "${selected_model_name}" not found unexpectedly.`
    )
    Logger.error({
      function_name: 'get_selected_provider',
      message: `Selected model "${selected_model_name}" not found in all_providers.`
    })
    return undefined
  }

  // Update the last used models in global state (put selected on top)
  const updated_last_used = [
    selected_model_name,
    ...last_used_models.filter((model) => model !== selected_model_name)
  ].slice(0, 5) // Keep only the top 5 most recent
  context.globalState.update('lastUsedApplyChangesModels', updated_last_used)

  Logger.log({
    function_name: 'get_selected_provider',
    message: 'Selected provider',
    data: selected_provider.name
  })
  return selected_provider
}

async function check_if_all_files_new(
  files: ClipboardFile[]
): Promise<boolean> {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    return false
  }

  // Create a map of workspace names to their root paths
  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })

  // Default workspace is the first one
  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  for (const file of files) {
    // Determine the correct workspace root for this file
    let workspace_root = default_workspace
    if (file.workspace_name && workspace_map.has(file.workspace_name)) {
      workspace_root = workspace_map.get(file.workspace_name)!
    }

    // Create safe path using the correct workspace root
    const safe_path = create_safe_path(workspace_root, file.file_path)

    if (safe_path && fs.existsSync(safe_path)) {
      return false // At least one file exists
    }
  }

  return true // All files are new
}

export function apply_changes_command(params: {
  command: string
  file_tree_provider: any // Keep for potential future use?
  open_editors_provider?: any // Keep for potential future use?
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

    const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
    const gemini_api_key = config.get<string>('geminiCoder.apiKey')
    const gemini_temperature = config.get<number>('geminiCoder.temperature')

    // Get default model from global state instead of config
    const default_model_name = model_manager.get_default_apply_changes_model()

    const all_providers = [
      ...BUILT_IN_PROVIDERS.map((provider) => ({
        ...provider,
        apiKey: gemini_api_key || '', // Use configured API key
        temperature: gemini_temperature // Use configured temperature
      })),
      ...user_providers // User providers should have their own keys/temp configured
    ].filter((p) => p.name && p.model) // Basic validation

    let provider: Provider | undefined
    if (params.use_default_model) {
      provider = all_providers.find((p) => p.name == default_model_name)
      if (!provider) {
        vscode.window.showErrorMessage(
          `Default apply changes model "${
            default_model_name || 'Not set'
          }" is not configured or invalid. Please set it in the settings.`
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
      if (!provider) {
        Logger.log({
          function_name: 'apply_changes_command',
          message: 'Provider selection cancelled or failed.'
        })
        return // Provider selection failed or was cancelled
      }
      Logger.log({
        function_name: 'apply_changes_command',
        message: 'Selected provider',
        data: provider.name
      })
    }

    // --- Mode Selection ---
    let selected_mode_label: 'Fast replace' | 'Intelligent update' | undefined =
      undefined
    let parsed_files: ClipboardFile[] = [] // Store parsed files if needed

    const is_multiple_files = is_multiple_files_clipboard(clipboard_text)

    if (is_multiple_files) {
      // Parse files early to check for ellipsis comment and existence
      parsed_files = parse_clipboard_multiple_files({
        clipboard_text,
        is_single_root_folder_workspace
      })

      // Check if all files are new (don't exist in workspace)
      const all_files_new = await check_if_all_files_new(parsed_files)

      if (all_files_new) {
        // All files are new - automatically use Fast replace mode
        selected_mode_label = 'Fast replace'
        Logger.log({
          function_name: 'apply_changes_command',
          message:
            'All files are new - automatically selecting Fast replace mode'
        })
      } else {
        const has_truncated_fragments =
          check_for_truncated_fragments(clipboard_text)
        const has_diff_markers = check_for_diff_markers(clipboard_text)
        const auto_select_intelligent =
          has_truncated_fragments || has_diff_markers

        if (auto_select_intelligent) {
          selected_mode_label = 'Intelligent update'
          Logger.log({
            function_name: 'apply_changes_command',
            message:
              'Auto-selecting Intelligent update mode due to detected truncated fragments or diff markers'
          })
        } else if (params.mode) {
          // Mode forced by command parameters (e.g., specific command bindings)
          selected_mode_label = params.mode
          Logger.log({
            function_name: 'apply_changes_command',
            message: 'Mode forced by command parameters',
            data: selected_mode_label
          })
        } else {
          // Multiple files, no ellipsis, no forced mode -> Ask the user
          const mode_options: vscode.QuickPickItem[] = [
            {
              label: 'Fast replace',
              description:
                'Create or replace files directly with the clipboard content.'
            },
            {
              label: 'Intelligent update',
              description:
                'Use AI to merge clipboard changes into existing files.'
            }
          ]
          const selected_item = await vscode.window.showQuickPick(
            mode_options,
            {
              placeHolder: 'Select how to apply changes to multiple files'
            }
          )

          if (!selected_item) {
            Logger.log({
              function_name: 'apply_changes_command',
              message: 'User cancelled mode selection.'
            })
            return // User cancelled
          }
          selected_mode_label = selected_item.label as
            | 'Fast replace'
            | 'Intelligent update'
          Logger.log({
            function_name: 'apply_changes_command',
            message: 'User selected mode',
            data: selected_mode_label
          })
        }
      }
    } else {
      // Single file always uses Intelligent Update implicitly
      selected_mode_label = 'Intelligent update'
      Logger.log({
        function_name: 'apply_changes_command',
        message: 'Single file detected, using Intelligent update mode.'
      })
    }

    // --- Execute Mode Handler ---
    let final_original_states: OriginalFileState[] | null = null
    let operation_success = false
    let file_count = 0

    if (selected_mode_label == 'Fast replace') {
      // We already know it's multiple files if we reach here with Fast replace selected.
      // Use the already parsed files if available, otherwise parse again (should be rare)
      const files_to_process =
        parsed_files.length > 0
          ? parsed_files
          : parse_clipboard_multiple_files({
              clipboard_text,
              is_single_root_folder_workspace
            })
      file_count = files_to_process.length
      const result = await handle_fast_replace(files_to_process)
      if (result.success && result.original_states) {
        final_original_states = result.original_states
        operation_success = true
      }
      Logger.log({
        function_name: 'apply_changes_command',
        message: 'Fast replace handler finished.',
        data: { success: result.success }
      })
    } else if (selected_mode_label == 'Intelligent update') {
      // Check for API key *before* calling the handler
      if (!provider.apiKey) {
        vscode.window.showErrorMessage(
          `API key is missing for provider "${provider.name}". Please add it in the settings.`
        )
        Logger.warn({
          function_name: 'apply_changes_command',
          message: 'API key is missing for Intelligent update',
          data: provider.name
        })
        return
      }

      const system_instructions = provider.systemInstructions // Get system instructions from selected provider

      final_original_states = await handle_intelligent_update({
        provider,
        clipboard_text,
        is_multiple_files,
        context: params.context,
        all_providers,
        default_model_name,
        is_single_root_folder_workspace,
        system_instructions
      })

      if (final_original_states) {
        operation_success = true
        file_count = final_original_states.length // Count based on states returned
      }
      Logger.log({
        function_name: 'apply_changes_command',
        message: 'Intelligent update handler finished.',
        data: { success: operation_success }
      })
    } else {
      Logger.error({
        function_name: 'apply_changes_command',
        message: 'No valid mode selected or determined.'
      })
      // Should not happen with the logic above, but good to log
      return
    }

    // --- Handle Results ---
    if (operation_success && final_original_states) {
      params.context.workspaceState.update(
        LAST_APPLIED_CHANGES_STATE_KEY,
        final_original_states
      )

      const message =
        selected_mode_label == 'Fast replace'
          ? `Successfully replaced ${file_count} ${
              file_count > 1 ? 'files' : 'file'
            }.`
          : `Successfully applied changes to ${file_count} ${
              file_count > 1 ? 'files' : 'file'
            }.`

      const button_text = 'Revert'
      const response = await vscode.window.showInformationMessage(
        message,
        button_text
      )

      if (response == button_text) {
        await revert_files(final_original_states)
        params.context.workspaceState.update(
          LAST_APPLIED_CHANGES_STATE_KEY,
          null
        )
      }
    } else {
      // Handler already showed specific error messages or handled cancellation silently.
      // Clear any potentially partially stored state from a failed operation.
      params.context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)
      Logger.log({
        function_name: 'apply_changes_command',
        message: 'Operation concluded without success.'
      })
    }

    Logger.log({
      function_name: 'apply_changes_command',
      message: 'end',
      data: {
        command: params.command,
        mode: selected_mode_label,
        success: operation_success
      }
    })
  })
}
