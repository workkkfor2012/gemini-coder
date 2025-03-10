import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'

export function refactor_to_clipboard_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.refactorToClipboard',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.')
        return
      }

      const document = editor.document
      const document_path = document.uri.fsPath
      const document_text = document.getText()

      const last_instruction = context.globalState.get<string>(
        'lastRefactoringInstruction',
        ''
      )

      const instruction = await vscode.window.showInputBox({
        prompt: 'Enter your refactoring instruction',
        placeHolder: 'e.g., "Refactor this code to use async/await"',
        value: last_instruction,
        validateInput: (value) => {
          context.globalState.update('lastRefactoringInstruction', value)
          return null
        }
      })

      if (!instruction) {
        return // User cancelled
      }

      const current_file_path = vscode.workspace.asRelativePath(document.uri)

      const selection = editor.selection
      const selected_text = editor.document.getText(selection)
      let refactor_instruction = `User requested refactor of a file "${current_file_path}". In your response send fully updated file only, without explanations or any other text.`
      if (selected_text) {
        refactor_instruction += ` Regarding the following snippet \`\`\`${selected_text}\`\`\` ${instruction}`
      } else {
        refactor_instruction += ` ${instruction}`
      }

      // Create files collector instance with both providers
      const files_collector = new FilesCollector(
        file_tree_provider,
        open_editors_provider
      )
      const context_text = await files_collector.collect_files({
        exclude_path: document_path
      })

      const content =
        '<files>\n' +
        context_text +
        `\n<file path="${current_file_path}">\n<![CDATA[\n${document_text}\n]]>\n</file>` +
        '\n</files>\n' +
        refactor_instruction

      await vscode.env.clipboard.writeText(content)
      vscode.window.showInformationMessage(
        'Refactoring instruction prompt copied to clipboard!'
      )
    }
  )
}
