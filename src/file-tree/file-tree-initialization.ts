import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { FileTreeProvider } from './file-tree-provider'

export function initialize_file_tree(
  context: vscode.ExtensionContext
): FileTreeProvider | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders

  let fileTreeProvider: FileTreeProvider | undefined

  if (workspaceFolders) {
    const workspaceRoot = workspaceFolders[0].uri.fsPath
    fileTreeProvider = new FileTreeProvider(workspaceRoot)

    const treeView = vscode.window.createTreeView('geminiFimView', {
      treeDataProvider: fileTreeProvider,
      manageCheckboxStateManually: true
    })

    // Add fileTreeProvider to ensure proper disposal
    context.subscriptions.push(fileTreeProvider)

    context.subscriptions.push(
      vscode.commands.registerCommand('geminiFim.copyContext', async () => {
        const checkedFiles = fileTreeProvider!.getCheckedFiles()

        if (checkedFiles.length === 0) {
          vscode.window.showWarningMessage('No files selected.')
          return
        }

        let xmlContent = ''

        for (const filePath of checkedFiles) {
          const content = fs.readFileSync(filePath, 'utf-8')
          // Escape any ']]>' sequences in file content

          const fileName = path.relative(
            vscode.workspace.workspaceFolders![0].uri.fsPath,
            filePath
          )

          xmlContent += `<file path="${fileName}">\n${content}\n</file>\n`
        }

        let finalOutput = `<files>\n${xmlContent.replace(
          /\n\s*\n/g,
          '\n'
        )}\n</files>`

        // Copy to clipboard
        await vscode.env.clipboard.writeText(finalOutput)

        vscode.window.showInformationMessage(
          'File contents copied to clipboard.'
        )
      }),
      vscode.commands.registerCommand('geminiFim.clearChecks', () => {
        fileTreeProvider!.clearChecks()
        vscode.window.showInformationMessage('All checks have been cleared.')
      }),
      vscode.commands.registerCommand('geminiFim.copyOpenFiles', async () => {
        const tabGroups: ReadonlyArray<vscode.TabGroup> =
          vscode.window.tabGroups.all

        let xmlContent = ''

        for (const group of tabGroups) {
          for (const tab of group.tabs) {
            if (tab.input instanceof vscode.TabInputText) {
              const fileUri = tab.input.uri
              const filePath = fileUri.fsPath
              if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8')
                const file_path = path.relative(
                  vscode.workspace.workspaceFolders![0].uri.fsPath,
                  filePath
                )

                xmlContent += `<file path="${file_path}">\n${content}\n</file>`
              }
            }
          }
        }

        if (xmlContent === '') {
          vscode.window.showWarningMessage('No open files to copy.')
          return
        }

        const finalOutput = `<files>\n${xmlContent.replace(
          /\n\s*\n/g,
          '\n'
        )}\n</files>`

        await vscode.env.clipboard.writeText(finalOutput)

        vscode.window.showInformationMessage('Open files copied to clipboard.')
      })
    )

    // Handle checkbox state changes asynchronously
    treeView.onDidChangeCheckboxState(async (e) => {
      for (const [item, state] of e.items) {
        await fileTreeProvider!.updateCheckState(item, state)
      }
    })
  } else {
    vscode.window.showInformationMessage(
      'Please open a workspace folder to use this extension.'
    )
  }

  return fileTreeProvider
}
