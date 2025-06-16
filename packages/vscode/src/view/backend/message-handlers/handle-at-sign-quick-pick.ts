import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { execSync } from 'child_process'

export const handle_at_sign_quick_pick = async (
  provider: ViewProvider
): Promise<void> => {
  const items = [
    {
      label: '@selection',
      description: 'Inject file path and text selection of the active editor'
    },
    {
      label: '@changes',
      description: 'Inject changes between current branch and selected branch'
    }
  ]

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select symbol to insert'
  })

  if (!selected) {
    return
  }

  if (selected.label == '@selection') {
    const current_text = provider.instructions
    const is_after_at_sign = current_text
      .slice(0, provider.caret_position)
      .endsWith('@')
    const text_to_insert = is_after_at_sign ? 'selection ' : '@selection '
    provider.add_text_at_cursor_position(text_to_insert)
  } else if (selected.label == '@changes') {
    try {
      const workspace_folders = vscode.workspace.workspaceFolders
      if (!workspace_folders || workspace_folders.length == 0) {
        vscode.window.showErrorMessage('No workspace folders found')
        return
      }

      const all_branches = new Set<string>()
      const workspace_with_branches: Array<{
        folder: vscode.WorkspaceFolder
        branches: string[]
      }> = []

      for (const folder of workspace_folders) {
        try {
          const branches = execSync('git branch --sort=-committerdate', {
            encoding: 'utf-8',
            cwd: folder.uri.fsPath
          })
            .split('\n')
            .map((b) => b.trim().replace(/^\* /, ''))
            .filter((b) => b.length > 0)

          if (branches.length > 0) {
            workspace_with_branches.push({ folder, branches })
            branches.forEach((branch) => all_branches.add(branch))
          }
        } catch (error) {
          console.log(`Skipping ${folder.name}: not a Git repository`)
        }
      }

      if (all_branches.size == 0) {
        vscode.window.showErrorMessage(
          'No Git branches found in any workspace folder'
        )
        return
      }

      const branch_items: vscode.QuickPickItem[] = []

      if (workspace_with_branches.length == 1) {
        const { branches } = workspace_with_branches[0]
        branch_items.push(
          ...branches.map((branch) => ({
            label: branch,
            description: `Compare with ${branch}`
          }))
        )
      } else {
        for (const { folder, branches } of workspace_with_branches) {
          branch_items.push(
            ...branches.map((branch) => ({
              label: branch,
              description: `Compare with ${branch} (${folder.name})`
            }))
          )
        }
      }

      const selected_branch = await vscode.window.showQuickPick(branch_items, {
        placeHolder: 'Select branch to compare with'
      })

      if (selected_branch) {
        const current_text = provider.instructions
        const is_after_at_sign = current_text
          .slice(0, provider.caret_position)
          .endsWith('@')
        const text_to_insert = is_after_at_sign
          ? `changes:${selected_branch.label} `
          : `@changes:${selected_branch.label} `
        provider.add_text_at_cursor_position(text_to_insert)
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        'Failed to get Git branches. Make sure you are in a Git repository.'
      )
    }
  }
}
