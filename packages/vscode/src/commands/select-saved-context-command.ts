import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../context/workspace-provider'

interface SavedContext {
  name: string
  paths: string[]
}

interface GeminiCoderConfig {
  savedContexts?: SavedContext[]
}

async function apply_saved_context(
  context: SavedContext,
  workspace_root: string,
  workspace_provider: WorkspaceProvider
): Promise<void> {
  // Convert relative paths to absolute paths
  const absolute_paths = context.paths.map((relativePath) =>
    path.isAbsolute(relativePath)
      ? relativePath
      : path.join(workspace_root, relativePath)
  )

  // Filter to only existing paths
  const existing_paths = absolute_paths.filter((p) => fs.existsSync(p))

  if (existing_paths.length === 0) {
    vscode.window.showWarningMessage(
      `No valid paths found in context "${context.name}"`
    )
    return
  }

  // Apply checked state to files
  await workspace_provider.set_checked_files(existing_paths)

  vscode.window.showInformationMessage(`Applied context "${context.name}".`)
}

async function create_example_config(
  workspace_root: string
): Promise<string | undefined> {
  const vscode_dir = path.join(workspace_root, '.vscode')
  const config_path = path.join(vscode_dir, 'gemini-coder.json')

  // Create .vscode directory if it doesn't exist
  if (!fs.existsSync(vscode_dir)) {
    fs.mkdirSync(vscode_dir)
  }

  // Create example config
  const example_config: GeminiCoderConfig = {
    savedContexts: [
      {
        name: 'Backend only',
        paths: ['packages/server/src']
      },
      {
        name: 'Frontend only',
        paths: ['packages/client/src']
      }
    ]
  }

  try {
    fs.writeFileSync(config_path, JSON.stringify(example_config, null, 2))
    vscode.window.showInformationMessage('Example config has been created.')
    return config_path
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to create example config: ${error.message}`
    )
    return undefined
  }
}

export function select_saved_context_command(
  workspace_provider: WorkspaceProvider | undefined
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'geminiCoder.selectSavedContext',
    async () => {
      if (!workspace_provider) {
        vscode.window.showErrorMessage('No workspace provider available')
        return
      }

      const workspace_root = workspace_provider.getWorkspaceRoot()
      const config_path = path.join(
        workspace_root,
        '.vscode',
        'gemini-coder.json'
      )

      // Check if the config file exists
      if (!fs.existsSync(config_path)) {
        // Create and open the example config file automatically
        const config_file_path = await create_example_config(workspace_root)
        if (config_file_path) {
          const document = await vscode.workspace.openTextDocument(
            config_file_path
          )
          await vscode.window.showTextDocument(document)
        }
        return
      }

      try {
        // Read the config file
        const config_content = fs.readFileSync(config_path, 'utf8')
        const config = JSON.parse(config_content) as GeminiCoderConfig

        if (!config.savedContexts || config.savedContexts.length == 0) {
          // Instead of showing message, update the config file with examples and open it
          config.savedContexts = [
            {
              name: 'Backend only',
              paths: ['packages/server/src/types', 'packages/server/src/utils']
            },
            {
              name: 'Frontend only',
              paths: [
                'packages/client/src/styles',
                'packages/client/src/helpers'
              ]
            }
          ]

          // Write the updated config back to the file
          fs.writeFileSync(config_path, JSON.stringify(config, null, 2))

          // Open the config file
          const document = await vscode.workspace.openTextDocument(config_path)
          await vscode.window.showTextDocument(document)

          vscode.window.showInformationMessage(
            'Example contexts has been added to the configuration file.'
          )
          return
        }

        // Show quick pick with saved contexts
        const selected = await vscode.window.showQuickPick(
          config.savedContexts.map((context) => ({
            label: context.name,
            description: `${context.paths.length} ${
              context.paths.length > 1 ? 'paths' : 'path'
            }`,
            context: context
          })),
          { placeHolder: 'Select a saved context' }
        )

        if (!selected) return

        // Apply the selected context
        await apply_saved_context(
          selected.context,
          workspace_root,
          workspace_provider
        )
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error reading saved contexts: ${error.message}`
        )
      }
    }
  )
}
