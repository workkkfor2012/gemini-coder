import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { FileTreeProvider } from './file-tree-provider'
import { FileItem } from './file-tree-provider'

export function file_tree_initialization(
  context: vscode.ExtensionContext
): FileTreeProvider | undefined {
  const workspace_folders = vscode.workspace.workspaceFolders

  let file_tree_provider: FileTreeProvider | undefined
  let gemini_coder_view: vscode.TreeView<FileItem>

  if (workspace_folders) {
    const workspace_root = workspace_folders[0].uri.fsPath
    file_tree_provider = new FileTreeProvider(workspace_root)

    gemini_coder_view = vscode.window.createTreeView('geminiCoderViewContext', {
      treeDataProvider: file_tree_provider,
      manageCheckboxStateManually: true
    })

    const update_activity_bar_badge_token_count = () => {
      const checked_files = file_tree_provider!.getCheckedFiles()
      let total_token_count = 0

      for (const file_path of checked_files) {
        // No need for try-catch here, getCheckedFiles now only returns files
        const file_content = fs.readFileSync(file_path, 'utf-8')
        total_token_count += Math.floor(file_content.length / 4)
      }

      // Update the badge on the activity bar
      gemini_coder_view.badge = {
        value: total_token_count,
        tooltip: `${total_token_count} tokens`
      }
    }

    // Add fileTreeProvider and treeView to ensure proper disposal
    context.subscriptions.push(file_tree_provider, gemini_coder_view)

    context.subscriptions.push(
      vscode.commands.registerCommand('geminiCoder.copyContext', async () => {
        const config = vscode.workspace.getConfiguration('geminiCoder')
        const attach_open_files = config.get<boolean>('attachOpenFiles')
        const set_focused_attribute = config.get<boolean>(
          'setFocusedAttribute',
          true
        )
        const checked_files = file_tree_provider!.getCheckedFiles()

        let xml_content = ''
        const added_files = new Set<string>()

        const focused_file = vscode.window.activeTextEditor?.document.uri.fsPath

        for (const file_path of checked_files) {
          if (fs.statSync(file_path).isFile()) {
            const content = fs.readFileSync(file_path, 'utf-8')
            const file_name = path.relative(
              vscode.workspace.workspaceFolders![0].uri.fsPath,
              file_path
            )

            // Add the focused attribute if this is the currently focused file and the setting is enabled
            const focused_attr =
              set_focused_attribute && file_path == focused_file
                ? ' focused="true"'
                : ''
            xml_content += `<file path="${file_name}"${focused_attr}>\n<![CDATA[\n${content}\n]]>\n</file>\n`
            added_files.add(file_path)
          }
        }

        // Add open files if attachOpenFiles is true
        if (attach_open_files) {
          const tab_groups: ReadonlyArray<vscode.TabGroup> =
            vscode.window.tabGroups.all

          for (const group of tab_groups) {
            for (const tab of group.tabs) {
              if (tab.input instanceof vscode.TabInputText) {
                const file_uri = tab.input.uri
                const file_path = file_uri.fsPath

                // Avoid duplicates (if an open file is also checked)
                if (fs.existsSync(file_path) && !added_files.has(file_path)) {
                  const content = fs.readFileSync(file_path, 'utf-8')
                  const relative_path = path.relative(
                    vscode.workspace.workspaceFolders![0].uri.fsPath,
                    file_path
                  )

                  // Add the focused attribute if this is the currently focused file and the setting is enabled
                  const focused_attr =
                    set_focused_attribute && file_path == focused_file
                      ? ' focused="true"'
                      : ''
                  xml_content += `<file path="${relative_path}"${focused_attr}>\n<![CDATA[\n${content}\n]]>\n</file>\n`
                  added_files.add(file_path)
                }
              }
            }
          }
        }

        if (xml_content == '') {
          vscode.window.showWarningMessage('No files selected or open.')
          return
        }

        let final_output = `<files>\n${xml_content}\n</files>`

        // Calculate token count here:
        let total_token_count = 0
        for (const filePath of added_files) {
          // Use added_files to avoid double-counting
          if (fs.existsSync(filePath)) {
            // Check if file exists before reading
            const file_content = fs.readFileSync(filePath, 'utf-8')
            total_token_count += Math.floor(file_content.length / 4) // 4 chars per token
          }
        }

        // Copy to clipboard
        await vscode.env.clipboard.writeText(final_output)

        // Display token count in the information message:
        vscode.window.showInformationMessage(
          `Context copied to clipboard (~${Math.round(
            total_token_count
          )} tokens).`
        )

        // Update token count after copying context
        update_activity_bar_badge_token_count()
      }),
      vscode.commands.registerCommand(
        'geminiCoder.copyContextCommand',
        async () => {
          // Re-use the copy context logic
          await vscode.commands.executeCommand('geminiCoder.copyContext')
        }
      ),
      vscode.commands.registerCommand('geminiCoder.clearChecks', () => {
        file_tree_provider!.clearChecks()
        vscode.window.showInformationMessage('All checks have been cleared.')

        // Update token count after clearing checks
        update_activity_bar_badge_token_count()
      })
    )

    // Handle checkbox state changes asynchronously
    gemini_coder_view.onDidChangeCheckboxState(async (e) => {
      for (const [item, state] of e.items) {
        await file_tree_provider!.updateCheckState(item, state)
      }

      // Update token count after checkbox changes
      update_activity_bar_badge_token_count()
    })

    // Initial update of the badge
    update_activity_bar_badge_token_count()
  } else {
    vscode.window.showInformationMessage(
      'Please open a workspace folder to use this extension.'
    )
  }

  return file_tree_provider
}
