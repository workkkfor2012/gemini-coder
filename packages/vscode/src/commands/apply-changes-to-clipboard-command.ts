import * as vscode from 'vscode'
import { apply_changes_instruction } from '../constants/instructions'

export function apply_changes_to_clipboard_command(
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.applyChangesToClipboard',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.')
        return
      }

      const document = editor.document
      const document_text = document.getText()

      const instruction = await vscode.env.clipboard.readText()

      const file_content = `<file><![CDATA[${document_text}]]></file>`
      const apply_changes_prompt = `${apply_changes_instruction} ${instruction}`
      const content = `${file_content}\n${apply_changes_prompt}`

      await vscode.env.clipboard.writeText(content)
      vscode.window.showInformationMessage(
        'Apply changes prompt copied to clipboard!'
      )
    }
  )
}
