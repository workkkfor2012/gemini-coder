import * as vscode from 'vscode'
import { WorkspaceProvider } from './workspace-provider'
import { FileItem } from './workspace-provider'
import { FilesCollector } from '../helpers/files-collector'
import { OpenEditorsProvider } from './open-editors-provider'
import { ignored_extensions } from './ignored-extensions'

export function context_initialization(context: vscode.ExtensionContext): {
  file_tree_provider: WorkspaceProvider | undefined
  open_editors_provider: OpenEditorsProvider | undefined
} {
  const workspace_folders = vscode.workspace.workspaceFolders

  let file_tree_provider: WorkspaceProvider | undefined
  let open_editors_provider: OpenEditorsProvider | undefined
  let gemini_coder_file_tree_view: vscode.TreeView<FileItem>
  let gemini_coder_open_editors_view: vscode.TreeView<FileItem>

  if (workspace_folders) {
    const workspace_root = workspace_folders[0].uri.fsPath
    const workspace_name = workspace_folders[0].name
    file_tree_provider = new WorkspaceProvider(workspace_root)
    open_editors_provider = new OpenEditorsProvider(
      workspace_root,
      ignored_extensions
    )

    // Create two separate tree views
    gemini_coder_file_tree_view = vscode.window.createTreeView(
      'geminiCoderViewWorkspace',
      {
        treeDataProvider: file_tree_provider,
        manageCheckboxStateManually: true
      }
    )
    gemini_coder_file_tree_view.title = workspace_name

    gemini_coder_open_editors_view = vscode.window.createTreeView(
      'geminiCoderViewOpenEditors',
      {
        treeDataProvider: open_editors_provider,
        manageCheckboxStateManually: true
      }
    )

    // Create FilesCollector instance that can collect from both providers
    const files_collector = new FilesCollector(
      file_tree_provider,
      open_editors_provider
    )

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

      // Update the badge on the workspace files view
      gemini_coder_file_tree_view.badge = {
        value: total_token_count,
        tooltip: `${total_token_count} tokens (including checked open editors)`
      }

      // Also update the badge on the open editors view with the same count
      gemini_coder_open_editors_view.badge = {
        value: total_token_count,
        tooltip: `${total_token_count} tokens (including checked workspace files)`
      }
    }

    // Add providers and treeViews to ensure proper disposal
    context.subscriptions.push(
      file_tree_provider,
      open_editors_provider,
      gemini_coder_file_tree_view,
      gemini_coder_open_editors_view
    )

    // Register the commands
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'geminiCoder.copyContextCommand',
        async () => {
          let context_text = ''

          try {
            context_text = await files_collector.collect_files()
          } catch (error: any) {
            console.error('Error collecting files:', error)
            vscode.window.showErrorMessage(
              'Error collecting files: ' + error.message
            )
            return
          }

          if (context_text == '') {
            vscode.window.showWarningMessage('No files selected or open.')
            return
          }

          context_text = `\n${context_text}\n`
          await vscode.env.clipboard.writeText(context_text)
          vscode.window.showInformationMessage(`Context copied to clipboard.`)
        }
      ),
      // Existing workspace commands
      vscode.commands.registerCommand('geminiCoder.clearChecks', () => {
        file_tree_provider!.clearChecks()
        update_activity_bar_badge_token_count()
      }),
      vscode.commands.registerCommand('geminiCoder.checkAll', async () => {
        await file_tree_provider!.check_all()
        update_activity_bar_badge_token_count()
      }),
      // New open editors commands
      vscode.commands.registerCommand(
        'geminiCoder.clearChecksOpenEditors',
        () => {
          open_editors_provider!.clearChecks()
          update_activity_bar_badge_token_count()
        }
      ),
      vscode.commands.registerCommand(
        'geminiCoder.checkAllOpenEditors',
        async () => {
          await open_editors_provider!.checkAll()
          update_activity_bar_badge_token_count()
        }
      )
    )

    // Handle checkbox state changes asynchronously for file tree
    gemini_coder_file_tree_view.onDidChangeCheckboxState(async (e) => {
      for (const [item, state] of e.items) {
        await file_tree_provider!.updateCheckState(item, state)
      }

      // Update token count after checkbox changes
      await update_activity_bar_badge_token_count()
    })

    // Handle checkbox state changes asynchronously for open editors
    gemini_coder_open_editors_view.onDidChangeCheckboxState(async (e) => {
      for (const [item, state] of e.items) {
        await open_editors_provider!.updateCheckState(item, state)
      }

      // Update token count after checkbox changes
      await update_activity_bar_badge_token_count()
    })

    // Update badge when configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('geminiCoder')) {
          // If attachOpenFiles setting changed, refresh the tree views
          if (event.affectsConfiguration('geminiCoder.attachOpenFiles')) {
            const config = vscode.workspace.getConfiguration('geminiCoder')
            const attachOpenFiles = config.get('attachOpenFiles', true)

            // Update the OpenEditorsProvider with the new setting value
            if (open_editors_provider) {
              open_editors_provider.updateAttachOpenFilesSetting(
                attachOpenFiles
              )
            }
          }

          update_activity_bar_badge_token_count()
        }
      })
    )

    // Update badge when tabs change with debouncing to avoid multiple updates
    let tabChangeTimeout: NodeJS.Timeout | null = null
    context.subscriptions.push(
      vscode.window.tabGroups.onDidChangeTabs(() => {
        // Clear previous timeout if it exists
        if (tabChangeTimeout) {
          clearTimeout(tabChangeTimeout)
        }
        // Set a new timeout to update after a short delay
        tabChangeTimeout = setTimeout(() => {
          update_activity_bar_badge_token_count()
          tabChangeTimeout = null
        }, 100) // 100ms debounce
      })
    )

    // Update title when workspace folders change
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        if (vscode.workspace.workspaceFolders) {
          const workspaceName = vscode.workspace.workspaceFolders[0].name
          gemini_coder_file_tree_view.title = workspaceName
        }
      })
    )

    // Fix for issue when the collapsed item has some of its children selected
    gemini_coder_file_tree_view.onDidCollapseElement(() => {
      file_tree_provider!.refresh()
    })

    // Initial update of the badge
    update_activity_bar_badge_token_count()
  } else {
    vscode.window.showInformationMessage(
      'Please open a workspace folder to use this extension.'
    )
  }

  return {
    file_tree_provider: file_tree_provider,
    open_editors_provider: open_editors_provider
  }
}
