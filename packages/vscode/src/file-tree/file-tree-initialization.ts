import * as vscode from 'vscode'
import { FileTreeProvider } from './file-tree-provider'
import { FileItem } from './file-tree-provider'
import { FilesCollector } from '../helpers/files-collector'

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

    // Create FilesCollector instance
    const files_collector = new FilesCollector(file_tree_provider)

    const update_activity_bar_badge_token_count = async () => {
      const config = vscode.workspace.getConfiguration('geminiCoder')
      let context_text = ''

      try {
        // Use FilesCollector to get all files
        context_text = await files_collector.collect_files({
          disable_xml: true
        })
      } catch (error) {
        console.error('Error collecting files:', error)
        return
      }

      // Calculate tokens from the collected context
      const total_token_count = Math.floor(context_text.length / 4)

      // Update the badge on the activity bar
      gemini_coder_view.badge = {
        value: total_token_count,
        tooltip: `${total_token_count} tokens${
          config.get<boolean>('attachOpenFiles', true)
            ? ' (including open files)'
            : ''
        }`
      }
    }

    // Add fileTreeProvider and treeView to ensure proper disposal
    context.subscriptions.push(file_tree_provider, gemini_coder_view)

    // Register the copy context command
    context.subscriptions.push(
      vscode.commands.registerCommand('geminiCoder.copyContext', async () => {
        let context_text = ''

        try {
          // Use FilesCollector to get all files
          context_text = await files_collector.collect_files()
        } catch (error: any) {
          console.error('Error collecting files:', error)
          vscode.window.showErrorMessage(
            'Error collecting files: ' + error.message
          )
          return
        }

        if (context_text === '') {
          vscode.window.showWarningMessage('No files selected or open.')
          return
        }

        const final_output = `<files>${context_text}</files>`

        // Calculate token count
        const total_token_count = Math.floor(context_text.length / 4)

        // Copy to clipboard
        await vscode.env.clipboard.writeText(final_output)

        // Display token count in the information message
        vscode.window.showInformationMessage(
          `Context copied to clipboard (~${Math.round(
            total_token_count
          )} tokens).`
        )

        // Update token count after copying context
        await update_activity_bar_badge_token_count()
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
      await update_activity_bar_badge_token_count()
    })

    // Update badge when configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('geminiCoder.attachOpenFiles')) {
          update_activity_bar_badge_token_count()
        }
      })
    )

    // Update badge when tabs change
    context.subscriptions.push(
      vscode.window.tabGroups.onDidChangeTabs(() => {
        update_activity_bar_badge_token_count()
      })
    )

    // Initial update of the badge
    update_activity_bar_badge_token_count()
  } else {
    vscode.window.showInformationMessage(
      'Please open a workspace folder to use this extension.'
    )
  }

  return file_tree_provider
}
