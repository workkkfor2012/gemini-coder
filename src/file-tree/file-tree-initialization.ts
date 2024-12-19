import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { FileTreeProvider } from './file-tree-provider'

export function initialize_file_tree(
  context: vscode.ExtensionContext
): FileTreeProvider | undefined {
  const workspace_folders = vscode.workspace.workspaceFolders

  let file_tree_provider: FileTreeProvider | undefined

  if (workspace_folders) {
    const workspace_root = workspace_folders[0].uri.fsPath
    file_tree_provider = new FileTreeProvider(workspace_root)

    const tree_view = vscode.window.createTreeView('geminiCoderView', {
      treeDataProvider: file_tree_provider,
      manageCheckboxStateManually: true
    })

    // Add fileTreeProvider to ensure proper disposal
    context.subscriptions.push(file_tree_provider)

    context.subscriptions.push(
      vscode.commands.registerCommand('geminiCoder.copyContext', async () => {
        const checked_files = file_tree_provider!.getCheckedFiles()

        if (checked_files.length === 0) {
          vscode.window.showWarningMessage('No files selected.')
          return
        }

        let xml_content = ''

        for (const filePath of checked_files) {
          const content = fs.readFileSync(filePath, 'utf-8')
          // Escape any ']]>' sequences in file content

          const file_name = path.relative(
            vscode.workspace.workspaceFolders![0].uri.fsPath,
            filePath
          )

          xml_content += `<file path="${file_name}">\n${content}\n</file>\n`
        }

        let final_output = `<files>\n${xml_content}\n</files>`

        // Copy to clipboard
        await vscode.env.clipboard.writeText(final_output)

        vscode.window.showInformationMessage(
          'File contents copied to clipboard.'
        )
      }),
      vscode.commands.registerCommand('geminiCoder.clearChecks', () => {
        file_tree_provider!.clearChecks()
        vscode.window.showInformationMessage('All checks have been cleared.')
      }),
      vscode.commands.registerCommand('geminiCoder.copyOpenFiles', async () => {
        const tab_groups: ReadonlyArray<vscode.TabGroup> =
          vscode.window.tabGroups.all

        let xml_content = ''

        for (const group of tab_groups) {
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

                xml_content += `<file path="${file_path}">\n${content}\n</file>`
              }
            }
          }
        }

        if (xml_content === '') {
          vscode.window.showWarningMessage('No open files to copy.')
          return
        }

        const final_output = `<files>\n${xml_content}\n</files>`

        await vscode.env.clipboard.writeText(final_output)

        vscode.window.showInformationMessage('Open files copied to clipboard.')
      })
    )

    // Handle checkbox state changes asynchronously
    tree_view.onDidChangeCheckboxState(async (e) => {
      for (const [item, state] of e.items) {
        await file_tree_provider!.updateCheckState(item, state)
      }
    })
  } else {
    vscode.window.showInformationMessage(
      'Please open a workspace folder to use this extension.'
    )
  }

  return file_tree_provider
}
