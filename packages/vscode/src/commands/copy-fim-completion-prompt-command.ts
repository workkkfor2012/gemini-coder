import * as vscode from 'vscode'
import { autocomplete_instruction } from '../constants/instructions'
import { FilesCollector } from '../helpers/files-collector'

export function copy_fim_completion_prompt_command(file_tree_provider: any) {
  return vscode.commands.registerCommand(
    'geminiCoder.copyFimCompletionPrompt',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.')
        return
      }

      const document = editor.document
      const document_path = document.uri.fsPath
      const position = editor.selection.active

      const text_before_cursor = document.getText(
        new vscode.Range(new vscode.Position(0, 0), position)
      )
      const text_after_cursor = document.getText(
        new vscode.Range(
          position,
          document.positionAt(document.getText().length)
        )
      )

      // Create files collector instance
      const files_collector = new FilesCollector(file_tree_provider)

      try {
        // Collect files excluding the current document
        const collected_files = await files_collector.collect_files([
          document_path
        ])

        const payload = {
          before: `<files>${collected_files}<file path="${vscode.workspace.asRelativePath(
            document.uri
          )}">\n<![CDATA[\n${text_before_cursor}`,
          after: `${text_after_cursor}\n]]>\n</file>\n</files>`
        }

        const content = `${payload.before}<fill missing code>${payload.after}\n${autocomplete_instruction}`

        await vscode.env.clipboard.writeText(content)
        vscode.window.showInformationMessage(
          'Autocomplete prompt copied to clipboard!'
        )
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to collect files: ${error.message}`
        )
      }
    }
  )
}
