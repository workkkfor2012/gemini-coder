import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export function create_file_command() {
  return vscode.commands.registerCommand(
    'geminiCoder.createFile',
    async (item?: vscode.TreeItem) => {
      if (!item || !item.resourceUri) {
        return
      }

      // Get the folder path from the selected item
      const folderPath = item.resourceUri.fsPath

      // Prompt user for the file name
      const fileName = await vscode.window.showInputBox({
        prompt: 'Enter file name',
        placeHolder: 'example.js'
      })

      if (!fileName) {
        return // User cancelled the input
      }

      try {
        // Create full file path
        const filePath = path.join(folderPath, fileName)

        // Check if file already exists
        if (fs.existsSync(filePath)) {
          const overwrite = await vscode.window.showWarningMessage(
            `File '${fileName}' already exists. Do you want to overwrite it?`,
            'Yes',
            'No'
          )
          if (overwrite !== 'Yes') {
            return
          }
        }

        // Create the file with empty content
        fs.writeFileSync(filePath, '')

        // Open the new file in the editor
        const document = await vscode.workspace.openTextDocument(filePath)
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
