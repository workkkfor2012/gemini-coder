import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/helpers/files-collector'
import { replace_selection_placeholder } from '@/utils/replace-selection-placeholder'
import { apply_preset_affixes_to_instruction } from '@/helpers/apply-preset-affixes'
import { LAST_SELECTED_PRESET_KEY } from '@/constants/state-keys'

export const handle_send_prompt = async (
  provider: ViewProvider,
  preset_names: string[]
): Promise<void> => {
  const valid_preset_names = await validate_presets(
    preset_names,
    provider.is_code_completions_mode,
    provider.context
  )

  if (valid_preset_names.length == 0) return

  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector(
    provider.workspace_provider,
    provider.open_editors_provider,
    provider.websites_provider
  )

  const active_editor = vscode.window.activeTextEditor
  const active_path = active_editor?.document.uri.fsPath

  if (provider.is_code_completions_mode && active_editor) {
    const document = active_editor.document
    const position = active_editor.selection.active

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )

    const context_text = await files_collector.collect_files({
      exclude_path: active_path
    })

    const workspace_folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    const relative_path = active_path!.replace(workspace_folder + '/', '')

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const chat_code_completion_instructions = config.get<string>(
      'chatCodeCompletionsInstructions'
    )

    const instructions = `${chat_code_completion_instructions}${
      provider.code_completion_suggestions
        ? ` Follow suggestions: ${provider.code_completion_suggestions}`
        : ''
    }`

    const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

    provider.websocket_server_instance.initialize_chats(
      text,
      valid_preset_names
    )
  } else if (!provider.is_code_completions_mode) {
    if (!provider.instructions) return

    const context_text = await files_collector.collect_files({
      active_path
    })

    let instructions = provider.instructions
    instructions = replace_selection_placeholder(instructions)
    instructions = apply_preset_affixes_to_instruction(
      instructions,
      valid_preset_names
    )

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const edit_format_instructions = config.get<string>(
      `editFormatInstructions${
        provider.edit_format.charAt(0).toUpperCase() +
        provider.edit_format.slice(1)
      }`
    )
    if (edit_format_instructions) {
      instructions += `\n${edit_format_instructions}`
    }

    const text = `${
      context_text ? `${instructions}\n<files>\n${context_text}</files>\n` : ''
    }${instructions}`

    provider.websocket_server_instance.initialize_chats(
      text,
      valid_preset_names
    )
  }

  vscode.window.showInformationMessage(
    valid_preset_names.length > 1
      ? 'Chats have been initialized in the connected browser.'
      : 'Chat has been initialized in the connected browser.'
  )
}

async function validate_presets(
  preset_names: string[],
  is_code_completions_mode: boolean,
  context: vscode.ExtensionContext
): Promise<string[]> {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets = config.get<any[]>('presets', [])
  const available_presets = presets.filter((preset) =>
    !is_code_completions_mode
      ? true
      : !preset.promptPrefix && !preset.promptSuffix
  )
  const available_preset_names = available_presets.map((preset) => preset.name)

  const valid_presets = preset_names.filter((name) =>
    available_preset_names.includes(name)
  )

  if (valid_presets.length == 0) {
    const last_selected_preset = context.globalState.get<string>(
      LAST_SELECTED_PRESET_KEY,
      ''
    )

    const move_up_button = {
      iconPath: new vscode.ThemeIcon('chevron-up'),
      tooltip: 'Move up'
    }

    const move_down_button = {
      iconPath: new vscode.ThemeIcon('chevron-down'),
      tooltip: 'Move down'
    }

    const create_items = () => {
      return available_presets.map((preset, index) => {
        const buttons = []

        if (available_presets.length > 1) {
          if (index > 0) {
            buttons.push(move_up_button)
          }

          if (index < available_presets.length - 1) {
            buttons.push(move_down_button)
          }
        }

        return {
          label: preset.name,
          description: `${preset.chatbot}${
            preset.model ? ` • ${preset.model}` : ''
          }`,
          index,
          buttons
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    const items = create_items()
    quick_pick.items = items
    quick_pick.placeholder = 'Select preset'

    if (
      last_selected_preset &&
      items.some((item: any) => item.label == last_selected_preset)
    ) {
      quick_pick.activeItems = [
        items.find((item: any) => item.label == last_selected_preset)!
      ]
    } else if (items.length > 0) {
      quick_pick.activeItems = [items[0]]
    }

    return new Promise<string[]>((resolve) => {
      quick_pick.onDidTriggerItemButton(async (event) => {
        const item = event.item as any
        const button = event.button
        const index = item.index

        if (button.tooltip == 'Move up' && index > 0) {
          const temp = available_presets[index]
          available_presets[index] = available_presets[index - 1]
          available_presets[index - 1] = temp

          // Save the reordered presets to configuration
          await config.update(
            'presets',
            available_presets,
            vscode.ConfigurationTarget.Global
          )

          quick_pick.items = create_items()
        } else if (
          button.tooltip == 'Move down' &&
          index < available_presets.length - 1
        ) {
          const temp = available_presets[index]
          available_presets[index] = available_presets[index + 1]
          available_presets[index + 1] = temp

          // Save the reordered presets to configuration
          await config.update(
            'presets',
            available_presets,
            vscode.ConfigurationTarget.Global
          )

          quick_pick.items = create_items()
        }
      })

      quick_pick.onDidAccept(() => {
        const selected = quick_pick.selectedItems[0] as any
        quick_pick.hide()

        if (selected) {
          const selected_name = selected.label
          context.globalState.update(LAST_SELECTED_PRESET_KEY, selected_name)
          resolve([selected_name])
        } else {
          resolve([])
        }
      })

      quick_pick.onDidHide(() => {
        quick_pick.dispose()
        resolve([])
      })

      quick_pick.show()
    })
  }

  return valid_presets
}
