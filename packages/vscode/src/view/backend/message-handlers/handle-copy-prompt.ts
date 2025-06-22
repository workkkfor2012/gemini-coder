import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/utils/replace-selection-placeholder'
import { replace_changes_placeholder } from '@/utils/replace-changes-placeholder'
import { chat_code_completion_instructions } from '@/constants/instructions'

export const handle_copy_prompt = async (
  provider: ViewProvider
): Promise<void> => {
  const files_collector = new FilesCollector(
    provider.workspace_provider,
    provider.open_editors_provider,
    provider.websites_provider
  )

  const active_editor = vscode.window.activeTextEditor

  let current_instruction = ''
  if (provider.web_mode == 'code-completions') {
    current_instruction = provider.code_completions_instructions
  } else if (provider.web_mode == 'ask') {
    current_instruction = provider.ask_instructions
  } else if (provider.web_mode == 'edit') {
    current_instruction = provider.edit_instructions
  } else if (provider.web_mode == 'no-context') {
    current_instruction = provider.no_context_instructions
  }

  if (provider.web_mode == 'code-completions' && active_editor) {
    const document = active_editor.document
    const position = active_editor.selection.active
    const active_path = document.uri.fsPath

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
    const relative_path = active_path.replace(workspace_folder + '/', '')

    const instructions = `${chat_code_completion_instructions(
      relative_path,
      position.line,
      position.character
    )}${
      current_instruction ? ` Follow instructions: ${current_instruction}` : ''
    }`

    const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

    vscode.env.clipboard.writeText(text)
  } else if (provider.web_mode != 'code-completions') {
    const context_text =
      provider.web_mode != 'no-context'
        ? await files_collector.collect_files()
        : ''

    let instructions = replace_selection_placeholder(current_instruction)

    if (instructions.includes('@changes:')) {
      instructions = await replace_changes_placeholder(instructions)
    }

    if (provider.web_mode == 'edit') {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const edit_format_instructions = config.get<string>(
        `editFormatInstructions${
          provider.chat_edit_format.charAt(0).toUpperCase() +
          provider.chat_edit_format.slice(1)
        }`
      )
      if (edit_format_instructions) {
        instructions += `\n${edit_format_instructions}`
      }
    }

    const text = `${
      context_text ? `${instructions}\n<files>\n${context_text}</files>\n` : ''
    }${instructions}`

    vscode.env.clipboard.writeText(text)
  } else {
    vscode.window.showWarningMessage(
      'Cannot copy prompt in code completion mode without an active editor.'
    )
    return
  }

  vscode.window.showInformationMessage('Prompt copied to clipboard!')
}
