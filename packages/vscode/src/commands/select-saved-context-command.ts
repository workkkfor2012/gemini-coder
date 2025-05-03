import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { SAVED_CONTEXTS_STATE_KEY } from '../constants/state-keys'
import { SavedContext } from '@/types/context'

async function apply_saved_context(
  context: SavedContext,
  workspace_root: string,
  workspace_provider: WorkspaceProvider
): Promise<void> {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const workspace_map = new Map<string, string>()

  for (const folder of workspace_folders) {
    workspace_map.set(folder.name, folder.uri.fsPath)
  }

  // Convert workspace-prefixed paths to absolute paths
  const absolute_paths = context.paths.map((prefixed_path) => {
    // Check if path has workspace prefix
    if (prefixed_path.includes(':')) {
      const [prefix, relative_path] = prefixed_path.split(':', 2)

      // Find the root for the given prefix
      const root = workspace_map.get(prefix)

      if (root) {
        return path.join(root, relative_path)
      }

      // Fallback if prefix doesn't match any workspace folder name - treat as a path in the current workspace
      console.warn(
        `Unknown workspace prefix "${prefix}" in path "${prefixed_path}". Treating as relative to current workspace root.`
      )
      return path.join(workspace_root, relative_path)
    }

    // Legacy support for paths without workspace prefix
    return path.isAbsolute(prefixed_path)
      ? prefixed_path
      : path.join(workspace_root, prefixed_path)
  })

  // Filter to only existing paths
  const existing_paths = absolute_paths.filter((p) => fs.existsSync(p))

  if (existing_paths.length == 0) {
    vscode.window.showWarningMessage(
      `No valid paths found in context "${context.name}".`
    )
    return
  }

  await workspace_provider.set_checked_files(existing_paths)
  vscode.window.showInformationMessage(`Applied context "${context.name}".`)
}

export function select_saved_context_command(
  workspace_provider: WorkspaceProvider | undefined,
  on_context_selected: () => void,
  extension_context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'geminiCoder.selectSavedContext',
    async () => {
      if (!workspace_provider) {
        vscode.window.showErrorMessage('No workspace provider available')
        return
      }

      const workspace_root = workspace_provider.getWorkspaceRoot()
      if (!workspace_root) {
        vscode.window.showErrorMessage('No workspace root found.')
        return
      }

      // Get saved contexts from workspace state
      const internal_contexts: SavedContext[] =
        extension_context.workspaceState.get(SAVED_CONTEXTS_STATE_KEY, [])

      // Check if .vscode/contexts.json exists
      const contexts_file_path = path.join(
        workspace_root,
        '.vscode',
        'contexts.json'
      )
      let file_contexts: SavedContext[] = []

      try {
        if (fs.existsSync(contexts_file_path)) {
          const content = fs.readFileSync(contexts_file_path, 'utf8')
          // Basic validation: ensure it's an array
          const parsed = JSON.parse(content)
          if (Array.isArray(parsed)) {
            // Further validation: check if items look like SavedContext
            file_contexts = parsed.filter(
              (item) =>
                typeof item === 'object' &&
                item !== null &&
                typeof item.name === 'string' &&
                Array.isArray(item.paths) &&
                item.paths.every((p: any) => typeof p === 'string')
            ) as SavedContext[]
          } else {
            console.warn('Contexts file is not an array:', contexts_file_path)
          }
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error reading contexts file: ${error.message}`
        )
        console.error('Error reading contexts file:', error)
      }

      // If no contexts found in either location, show message
      if (internal_contexts.length === 0 && file_contexts.length === 0) {
        vscode.window.showInformationMessage('No saved contexts found.')
        return
      }

      let contexts_to_use: SavedContext[] = []
      let context_source: 'internal' | 'file' | undefined = undefined

      // If both sources have contexts, ask user which one to use
      if (internal_contexts.length > 0 && file_contexts.length > 0) {
        const source = await vscode.window.showQuickPick(
          [
            {
              label: 'Internal Store',
              description: `${internal_contexts.length} ${
                internal_contexts.length == 1 ? 'context' : 'contexts'
              }`,
              value: 'internal'
            },
            {
              label: 'JSON File',
              description: `${file_contexts.length} ${
                file_contexts.length == 1 ? 'context' : 'contexts'
              }`,
              value: 'file'
            }
          ],
          {
            placeHolder: 'Select contexts location'
          }
        )

        if (!source) return // User cancelled

        context_source = source.value as 'internal' | 'file'
        contexts_to_use =
          context_source == 'internal' ? internal_contexts : file_contexts
      } else if (internal_contexts.length > 0) {
        contexts_to_use = internal_contexts
        context_source = 'internal'
      } else if (file_contexts.length > 0) {
        contexts_to_use = file_contexts
        context_source = 'file'
      }

      if (!context_source || contexts_to_use.length === 0) {
        vscode.window.showInformationMessage(
          'No saved contexts found in the selected source.'
        )
        return
      }

      try {
        // Define delete button
        const delete_button = {
          iconPath: new vscode.ThemeIcon('trash'),
          tooltip: 'Delete this saved context'
        }

        // Function to create quickpick items from contexts
        const createQuickPickItems = (
          contexts: SavedContext[],
          source: 'internal' | 'file'
        ) => {
          return contexts.map((context) => ({
            label: context.name,
            description: `${context.paths.length} ${
              context.paths.length > 1 ? 'paths' : 'path'
            }`,
            context: context,
            buttons: source == 'internal' ? [delete_button] : [] // Only show delete button for internal contexts
          }))
        }

        // Create QuickPick with buttons
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = createQuickPickItems(contexts_to_use, context_source)
        quick_pick.placeholder = `Select saved context (from ${
          context_source == 'internal'
            ? 'internal store'
            : '.vscode/contexts.json'
        })`

        // Create a promise to be resolved when an item is picked or the quick pick is hidden
        const quick_pick_promise = new Promise<
          (vscode.QuickPickItem & { context: SavedContext }) | undefined
        >((resolve) => {
          quick_pick.onDidAccept(() => {
            const selectedItem = quick_pick
              .activeItems[0] as vscode.QuickPickItem & {
              context: SavedContext
            }
            quick_pick.hide()
            resolve(selectedItem)
          })

          quick_pick.onDidHide(() => {
            resolve(undefined)
          })

          quick_pick.onDidTriggerItemButton(async (event) => {
            // Only handle delete for internal contexts
            if (context_source != 'internal') return

            const item = event.item as vscode.QuickPickItem & {
              context: SavedContext
            }
            const confirm_delete = await vscode.window.showWarningMessage(
              `Are you sure you want to delete context "${item.context.name}"?`,
              { modal: true },
              'Delete'
            )

            if (confirm_delete == 'Delete') {
              // Remove the context from the state
              const updatedContexts = internal_contexts.filter(
                (c) => c.name != item.context.name
              )

              // Update workspace state
              await extension_context.workspaceState.update(
                SAVED_CONTEXTS_STATE_KEY,
                updatedContexts
              )
              vscode.window.showInformationMessage(
                `Deleted context "${item.context.name}"`
              )

              // Update the quick pick items
              if (updatedContexts.length == 0) {
                quick_pick.hide()
                vscode.window.showInformationMessage(
                  'No saved contexts remaining in the internal store.'
                )
              } else {
                // Update items and ensure the quick pick stays visible
                quick_pick.items = createQuickPickItems(
                  updatedContexts,
                  'internal'
                )
                quick_pick.show() // Ensure quick pick is visible
              }
            }
          })
        })

        quick_pick.show()
        const selected = await quick_pick_promise
        if (!selected) return

        await apply_saved_context(
          selected.context,
          workspace_root,
          workspace_provider
        )

        // Only update recent contexts list for internal contexts
        if (context_source == 'internal') {
          // Move the selected context to the top of the list
          const updated_contexts = internal_contexts.filter(
            (c) => c.name != selected.context.name
          )
          updated_contexts.unshift(selected.context)
          await extension_context.workspaceState.update(
            SAVED_CONTEXTS_STATE_KEY,
            updated_contexts
          )
        }

        on_context_selected()
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error selecting saved context: ${error.message}`
        )
        console.error('Error selecting saved context:', error)
      }
    }
  )
}
