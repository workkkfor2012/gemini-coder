import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'

export function copy_apply_changes_prompt_command(file_tree_provider: any) {
  return vscode.commands.registerCommand(
    'geminiCoder.copyApplyChangesPrompt',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.')
        return
      }

      const document = editor.document
      const document_path = document.uri.fsPath
      const document_text = document.getText()

      const instruction = await vscode.env.clipboard.readText()

      // Create files collector instance
      const files_collector = new FilesCollector(file_tree_provider)
      let context_text = ''

      try {
        // Collect files excluding the current document
        context_text = await files_collector.collect_files([document_path])
      } catch (error: any) {
        console.error('Error collecting files:', error)
        vscode.window.showErrorMessage(
          'Error collecting files: ' + error.message
        )
        return
      }

      const current_file_path = vscode.workspace.asRelativePath(document.uri)
      const files = `<files>${context_text}\n<file path="${current_file_path}">\n<![CDATA[\n${document_text}\n]]>\n</file>\n</files>`
      const apply_changes_instruction = `User requested refactor of file "${current_file_path}". In your response send fully updated <file> only, without explanations or any other text. ${instruction}`
      const content = `${files}\n${apply_changes_instruction}`

      await vscode.env.clipboard.writeText(content)
      vscode.window.showInformationMessage(
        'Apply changes prompt copied to clipboard!'
      )
    }
  )
}
