import * as vscode from 'vscode'
import * as path from 'path'

export function new_file_command() {
  return vscode.commands.registerCommand(
    'geminiCoder.newFile',
    async (item?: vscode.TreeItem) => {
      // If item is not provided, we can't create a file
      if (!item?.resourceUri) {
        return
      }

      const parent_path = item.resourceUri.fsPath

      // Prompt user for the file name
      const file_name = await vscode.window.showInputBox({
        prompt: 'Enter file name',
        placeHolder: ''
      })

      // If user cancelled or didn't enter a name, abort
      if (!file_name) {
        return
      }

      try {
        // Create full file path
        const file_path = path.join(parent_path, file_name)

        // Check if file already exists
        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(file_path))
          vscode.window.showErrorMessage(`File '${file_name}' already exists.`)
          return
        } catch {
          // File doesn't exist, which is what we want
        }

        // Create the file with empty content
        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(file_path),
          new Uint8Array()
        )

        // Open the new file in the editor
        const document = await vscode.workspace.openTextDocument(file_path)
        await vscode.window.showTextDocument(document)

        // Refresh the workspace tree view
        vscode.commands.executeCommand('geminiCoderViewWorkspace.refresh')
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to create file: ${error.message}`
        )
      }
    }
  )
}
