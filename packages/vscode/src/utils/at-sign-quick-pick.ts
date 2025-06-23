import * as vscode from 'vscode'
import { execSync } from 'child_process'

export async function at_sign_quick_pick(): Promise<string | undefined> {
  const items = [
    {
      label: '@Selection',
      description: 'Inject text selection of the active editor'
    },
    {
      label: '@Changes',
      description: 'Inject changes between current branch and selected branch'
    }
  ]

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select symbol to insert',
    matchOnDescription: true
  })

  if (!selected) {
    return
  }

  if (selected.label == '@Selection') {
    return 'Selection '
  }

  if (selected.label == '@Changes') {
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

      if (workspace_with_branches.length === 1) {
        const { branches } = workspace_with_branches[0]
        branch_items.push(
          ...branches.map((branch) => ({
            label: branch
          }))
        )
      } else {
        // Multi-root workspace: include folder name with branch
        for (const { folder, branches } of workspace_with_branches) {
          branch_items.push(
            ...branches.map((branch) => ({
              label: `${folder.name}/${branch}`,
              description: folder.name
            }))
          )
        }
      }

      const selected_branch = await vscode.window.showQuickPick(branch_items, {
        placeHolder: 'Select branch to compare with'
      })

      if (selected_branch) {
        // For single root workspace, keep existing format
        if (workspace_with_branches.length === 1) {
          return `Changes:${selected_branch.label} `
        } else {
          // For multi-root workspace, return format: changes:[folder name]/[branch name]
          return `Changes:${selected_branch.label} `
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        'Failed to get Git branches. Make sure you are in a Git repository.'
      )
    }
  }

  return undefined
}
