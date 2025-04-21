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
      const uri = vscode.Uri.file(path)

      // Ask for confirmation before deleting
      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this item?',
        { modal: true },
        'Delete'
      )

      if (result != 'Delete') {
        return
      }

      try {
        // Check if the file is currently open in any editor
        const open_documents = vscode.workspace.textDocuments
        const document_to_close = open_documents.find(
          (doc) => doc.uri.fsPath == path
        )

        if (document_to_close) {
          // Close the document if it's open
          await vscode.window.showTextDocument(document_to_close.uri, {
            preview: false
          })
          await vscode.commands.executeCommand(
            'workbench.action.closeActiveEditor'
          )
        }

        // Delete the file or folder
        await vscode.workspace.fs.delete(uri, {
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
