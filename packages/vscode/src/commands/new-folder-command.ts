import * as vscode from 'vscode'
import * as path from 'path'

export function new_folder_command() {
  return vscode.commands.registerCommand(
    'geminiCoder.newFolder',
    async (item?: vscode.TreeItem) => {
      // If item is not provided, we can't create a folder
      if (!item?.resourceUri) {
        return
      }

      const parent_path = item.resourceUri.fsPath

      // Ask user for folder name
      const folder_name = await vscode.window.showInputBox({
        prompt: 'Enter folder name',
        placeHolder: ''
      })

      // If user cancelled or didn't enter a name, abort
      if (!folder_name) {
        return
      }

      try {
        // Create full path for new folder
        const new_folder_path = path.join(parent_path, folder_name)

        // Check if folder already exists
        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(new_folder_path))
          vscode.window.showErrorMessage(
            `Folder '${folder_name}' already exists.`
          )
          return
        } catch {
          // Folder doesn't exist, which is what we want
        }

        // Create the folder
        await vscode.workspace.fs.createDirectory(
          vscode.Uri.file(new_folder_path)
        )

        // Refresh the workspace tree view
        vscode.commands.executeCommand('geminiCoderViewWorkspace.refresh')
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to create folder: ${error.message}`
        )
      }
    }
  )
}
