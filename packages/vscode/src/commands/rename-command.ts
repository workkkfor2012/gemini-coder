import * as vscode from 'vscode'
import * as path from 'path'
import { create_safe_path } from '../utils/path-sanitizer'

export function rename_command() {
  return vscode.commands.registerCommand(
    'codeWebChat.rename',
    async (item?: vscode.TreeItem) => {
      if (!item?.resourceUri) {
        return
      }

      const old_path = item.resourceUri.fsPath
      const dir_name = path.dirname(old_path)
      const current_name = path.basename(old_path)

      const new_name = await vscode.window.showInputBox({
        prompt: 'Enter new name',
        placeHolder: '',
        value: current_name
      })

      if (!new_name || new_name == current_name) {
        return
      }

      try {
        const new_path = create_safe_path(dir_name, new_name)

        if (!new_path) {
          vscode.window.showErrorMessage(`Invalid name: '${new_name}'`)
          return
        }

        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(new_path))
          vscode.window.showErrorMessage(
            `A file or folder named '${path.basename(
              new_path
            )}' already exists.`
          )
          return
        } catch {
          // Target doesn't exist, proceed with renaming.
        }

        await vscode.workspace.fs.rename(
          vscode.Uri.file(old_path),
          vscode.Uri.file(new_path),
          { overwrite: false }
        )
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to rename: ${error.message}`)
      }
    }
  )
}
