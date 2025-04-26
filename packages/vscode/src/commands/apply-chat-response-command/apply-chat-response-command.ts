import * as vscode from 'vscode'
import * as fs from 'fs'
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
import { ApiToolsSettingsManager } from '@/services/api-tools-settings-manager'

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

export function apply_chat_response_command(params: {
  command: string
  context: vscode.ExtensionContext
  use_default_model?: boolean
  mode?: 'Fast replace' | 'Intelligent update'
}) {
  return vscode.commands.registerCommand(params.command, async () => {
    Logger.log({
      function_name: 'apply_chat_response_command',
      message: 'start',
      data: { command: params.command, mode: params.mode }
    })
    const clipboard_text = await vscode.env.clipboard.readText()

    if (!clipboard_text) {
      vscode.window.showErrorMessage('Clipboard is empty.')
      Logger.warn({
        function_name: 'apply_chat_response_command',
        message: 'Clipboard is empty.'
      })
      return
    }

    // Check if workspace has only one root folder
    const is_single_root_folder_workspace =
      vscode.workspace.workspaceFolders?.length == 1

    // --- Mode Selection ---
    let selected_mode_label: 'Fast replace' | 'Intelligent update' | undefined =
      undefined
    let parsed_files: ClipboardFile[] = [] // Store parsed files if needed

    const is_multiple_files = is_multiple_files_clipboard(clipboard_text)

    if (is_multiple_files) {
      parsed_files = parse_clipboard_multiple_files({
        clipboard_text,
        is_single_root_folder_workspace
      })

      const all_files_new = await check_if_all_files_new(parsed_files)

      if (all_files_new) {
        selected_mode_label = 'Fast replace'
        Logger.log({
          function_name: 'apply_chat_response_command',
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
            function_name: 'apply_chat_response_command',
            message:
              'Auto-selecting Intelligent update mode due to detected truncated fragments or diff markers'
          })
        } else if (params.mode) {
          selected_mode_label = params.mode
          Logger.log({
            function_name: 'apply_chat_response_command',
            message: 'Mode forced by command parameters',
            data: selected_mode_label
          })
        } else {
          // Instead of showing dialog, default to fast replace
          selected_mode_label = 'Fast replace'
          Logger.log({
            function_name: 'apply_chat_response_command',
            message: 'Defaulting to Fast replace mode'
          })
        }
      }
    } else {
      vscode.window.showErrorMessage(
        'Clipboard content must contain properly formatted code blocks. Each code block should start with a file path comment. This is ensured by default system instructions for AI Studio, OpenRouter and Open WebUI.'
      )
      return
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
        function_name: 'apply_chat_response_command',
        message: 'Fast replace handler finished.',
        data: { success: result.success }
      })
    } else if (selected_mode_label == 'Intelligent update') {
      const api_tool_settings_manager = new ApiToolsSettingsManager(
        params.context
      )

      const apply_chat_response_settings =
        api_tool_settings_manager.get_apply_chat_response_settings()

      if (!apply_chat_response_settings.provider) {
        vscode.window.showErrorMessage(
          'API provider is not specified for Apply Chat Response tool. Please configure them in API Tools -> Configuration.'
        )
        Logger.warn({
          function_name: 'apply_chat_response_command',
          message: 'API provider is not specified for Apply Chat Response tool.'
        })
        return
      } else if (!apply_chat_response_settings.model) {
        vscode.window.showErrorMessage(
          'Model is not specified for Apply Chat Response tool. Please configure them in API Tools -> Configuration.'
        )
        Logger.warn({
          function_name: 'apply_chat_response_command',
          message: 'Model is not specified for Apply Chat Response tool.'
        })
        return
      }

      const connection_details =
        api_tool_settings_manager.provider_to_connection_details(
          apply_chat_response_settings.provider
        )

      final_original_states = await handle_intelligent_update({
        endpoint_url: connection_details.endpoint_url,
        api_key: connection_details.api_key,
        model: apply_chat_response_settings.model,
        temperature: apply_chat_response_settings.temperature || 0,
        clipboard_text,
        context: params.context,
        is_single_root_folder_workspace
      })

      if (final_original_states) {
        operation_success = true
        file_count = final_original_states.length // Count based on states returned
      }
      Logger.log({
        function_name: 'apply_chat_response_command',
        message: 'Intelligent update handler finished.',
        data: { success: operation_success }
      })
    } else {
      Logger.error({
        function_name: 'apply_chat_response_command',
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

      // Show appropriate buttons based on whether all files are new
      if (selected_mode_label == 'Fast replace') {
        const all_files_new = await check_if_all_files_new(parsed_files)
        const buttons = all_files_new
          ? ['Revert']
          : ['Revert', 'Looks off, use API tool']

        const response = await vscode.window.showInformationMessage(
          message,
          ...buttons
        )

        if (response == 'Revert') {
          await revert_files(final_original_states)
          params.context.workspaceState.update(
            LAST_APPLIED_CHANGES_STATE_KEY,
            null
          )
        } else if (response == 'Looks off, use API tool') {
          // First revert the fast replace changes
          await revert_files(final_original_states)

          // Then trigger intelligent update
          const api_tool_settings_manager = new ApiToolsSettingsManager(
            params.context
          )
          const apply_chat_response_settings =
            api_tool_settings_manager.get_apply_chat_response_settings()

          if (
            !apply_chat_response_settings.provider ||
            !apply_chat_response_settings.model
          ) {
            vscode.window.showErrorMessage(
              'API provider or model is not configured for Intelligent update. Please configure them in API Tools -> Configuration.'
            )
            return
          }

          const connection_details =
            api_tool_settings_manager.provider_to_connection_details(
              apply_chat_response_settings.provider
            )

          final_original_states = await handle_intelligent_update({
            endpoint_url: connection_details.endpoint_url,
            api_key: connection_details.api_key,
            model: apply_chat_response_settings.model,
            temperature: apply_chat_response_settings.temperature || 0,
            clipboard_text,
            context: params.context,
            is_single_root_folder_workspace
          })

          if (final_original_states) {
            params.context.workspaceState.update(
              LAST_APPLIED_CHANGES_STATE_KEY,
              final_original_states
            )
            vscode.window
              .showInformationMessage(
                `Successfully updated ${file_count} ${
                  file_count > 1 ? 'files' : 'file'
                } using API tool.`,
                'Revert'
              )
              .then((response) => {
                if (response == 'Revert') {
                  revert_files(final_original_states!)
                  params.context.workspaceState.update(
                    LAST_APPLIED_CHANGES_STATE_KEY,
                    null
                  )
                }
              })
          }
        }
      } else {
        // For intelligent update, show only Revert button
        const response = await vscode.window.showInformationMessage(
          message,
          'Revert'
        )

        if (response == 'Revert') {
          await revert_files(final_original_states)
          params.context.workspaceState.update(
            LAST_APPLIED_CHANGES_STATE_KEY,
            null
          )
        }
      }
    } else {
      // Handler already showed specific error messages or handled cancellation silently.
      // Clear any potentially partially stored state from a failed operation.
      params.context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)
      Logger.log({
        function_name: 'apply_chat_response_command',
        message: 'Operation concluded without success.'
      })
    }

    Logger.log({
      function_name: 'apply_chat_response_command',
      message: 'end',
      data: {
        command: params.command,
        mode: selected_mode_label,
        success: operation_success
      }
    })
  })
}
