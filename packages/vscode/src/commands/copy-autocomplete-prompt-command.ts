import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { autocomplete_instruction } from '../constants/instructions'

export function copy_autocomplete_prompt_command(file_tree_provider: any) {
  return vscode.commands.registerCommand(
    'geminiCoder.copyAutocompletePrompt',
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
        context_text += `\n<file path="${relative_path}">\n<![CDATA[\n${file_content}\n]]>\n</file>`
      }

      const payload = {
        before: `<files>${context_text}\n<file path="${vscode.workspace.asRelativePath(
          document.uri
        )}">\n${text_before_cursor}`,
        after: `${text_after_cursor}\n</file>\n</files>`
      }

      const content = `${payload.before}<fill missing code>${payload.after}\n${autocomplete_instruction}`

      await vscode.env.clipboard.writeText(content)
      vscode.window.showInformationMessage(
        'Autocomplete prompt copied to clipboard!'
      )
    }
  )
}
