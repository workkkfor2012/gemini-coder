import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { Logger } from '../helpers/logger'
import { extract_paths_from_text } from '../helpers/path-parser'

export function apply_context_from_clipboard_command(
  workspace_provider: WorkspaceProvider | undefined
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'codeWebChat.applyContextFromClipboard',
    async () => {
      if (!workspace_provider) {
        return
      }

      try {
        const clipboard_text = await vscode.env.clipboard.readText()
        if (!clipboard_text) {
          vscode.window.showInformationMessage(
            'No file paths found in clipboard.'
          )
          return
        }

        const paths = extract_paths_from_text(clipboard_text)
        if (paths.length == 0) {
          vscode.window.showInformationMessage(
            'No file paths found in clipboard.'
          )
          return
        }

        const workspace_roots = workspace_provider.getWorkspaceRoots()
        const absolute_paths: string[] = []

        const workspace_map = new Map<string, string>()
        if (vscode.workspace.workspaceFolders) {
          vscode.workspace.workspaceFolders.forEach((folder) => {
            workspace_map.set(folder.name, folder.uri.fsPath)
          })
        }

        for (const raw_path of paths) {
          if (path.isAbsolute(raw_path)) {
            absolute_paths.push(raw_path)
            continue
          }

          let resolved_path: string | null = null

          if (workspace_map.size > 1) {
            for (const [workspace_name, workspace_root] of workspace_map) {
              if (
                raw_path.startsWith(workspace_name + '/') ||
                raw_path.startsWith(workspace_name + '\\')
              ) {
                const relative_path = raw_path.substring(
                  workspace_name.length + 1
                )
                resolved_path = path.join(workspace_root, relative_path)
                break
              }
            }
          }

          if (resolved_path) {
            absolute_paths.push(resolved_path)
          } else {
            for (const root of workspace_roots) {
              const potential_path = path.join(root, raw_path)
              absolute_paths.push(potential_path)
            }
          }
        }

        const existing_paths = absolute_paths.filter((p) => {
          try {
            return fs.existsSync(p) && fs.statSync(p).isFile()
          } catch {
            return false
          }
        })

        if (existing_paths.length == 0) {
          vscode.window.showInformationMessage(
            'No matching files found in workspace for the paths in clipboard.'
          )
          return
        }

        Logger.log({
          message: `Found ${existing_paths.length} valid path${
            existing_paths.length == 1 ? '' : 's'
          }.`,
          data: { paths: existing_paths }
        })

        await workspace_provider.set_checked_files(existing_paths)
        vscode.window.showInformationMessage(
          `Found ${existing_paths.length} valid path${
            existing_paths.length == 1 ? '' : 's'
          }.`
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to select files from clipboard: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }
  )
}
