import * as vscode from 'vscode'

export function delete_command() {
  return vscode.commands.registerCommand(
    'geminiCoder.delete',
    async (item?: vscode.TreeItem) => {
      // If item is not provided, we can't delete
      if (!item?.resourceUri) {
        return
      }

      const path = item.resourceUri.fsPath

      // Ask for confirmation before deleting
      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this item?',
        { modal: true },
        'Delete'
      )

      if (result !== 'Delete') {
        return
      }

      try {
        // Delete the file or folder
        await vscode.workspace.fs.delete(vscode.Uri.file(path), {
          recursive: true
        })

        // Refresh the workspace tree view
        vscode.commands.executeCommand('geminiCoderViewWorkspace.refresh')
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to delete: ${error.message}`)
      }
    }
  )
}
