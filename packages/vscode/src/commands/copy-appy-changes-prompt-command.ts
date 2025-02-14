import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export function copy_apply_changes_prompt_command(file_tree_provider: any) {
  return vscode.commands.registerCommand(
    'geminiCoder.copyApplyChangesPrompt',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const attach_open_files = config.get<boolean>(
        'geminiCoder.attachOpenFiles'
      )

      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.')
        return
      }

      const document = editor.document
      const document_path = document.uri.fsPath
      const document_text = document.getText()

      const instruction = await vscode.env.clipboard.readText()

      let file_paths_to_be_attached: Set<string> = new Set()
      if (file_tree_provider) {
        const selected_files_paths = file_tree_provider.getCheckedFiles()
        for (const file_path of selected_files_paths) {
          if (file_path != document_path) {
            file_paths_to_be_attached.add(file_path)
          }
        }
      }

      if (attach_open_files) {
        const open_tabs = vscode.window.tabGroups.all
          .flatMap((group) => group.tabs)
          .map((tab) =>
            tab.input instanceof vscode.TabInputText ? tab.input.uri : null
          )
          .filter((uri): uri is vscode.Uri => uri !== null)
        for (const open_file_uri of open_tabs) {
          if (open_file_uri.fsPath != document_path) {
            file_paths_to_be_attached.add(open_file_uri.fsPath)
          }
        }
      }

      let context_text = ''
      for (const path_to_be_attached of file_paths_to_be_attached) {
        let file_content = fs.readFileSync(path_to_be_attached, 'utf8')
        const relative_path = path.relative(
          vscode.workspace.workspaceFolders![0].uri.fsPath,
          path_to_be_attached
        )
        // Use CDATA for file content to handle special characters correctly
        context_text += `\n<file path="${relative_path}">\n<![CDATA[\n${file_content}\n]]>\n</file>`
      }

      const current_file_path = vscode.workspace.asRelativePath(document.uri)

      const payload = {
        before: `<files>${context_text}\n<file path="${current_file_path}">\n<![CDATA[\n${document_text}\n]]>`,
        after: `\n</file>\n</files>`
      }

      const apply_changes_instruction = `User requested refactor of file "${current_file_path}". In your response send fully updated <file> only, without explanations or any other text. ${instruction}`

      const content = `${payload.before}${payload.after}\n${apply_changes_instruction}`

      await vscode.env.clipboard.writeText(content)
      vscode.window.showInformationMessage(
        'Apply changes prompt copied to clipboard!'
      )
    }
  )
}
