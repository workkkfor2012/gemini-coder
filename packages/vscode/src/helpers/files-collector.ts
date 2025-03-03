import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { FileTreeProvider } from '../file-tree/file-tree-provider'

export class FilesCollector {
  private file_tree_provider: FileTreeProvider
  private workspace_root: string

  constructor(file_tree_provider: FileTreeProvider) {
    this.file_tree_provider = file_tree_provider
    // Get workspace root from VS Code API
    const workspace_folders = vscode.workspace.workspaceFolders
    this.workspace_root = workspace_folders
      ? workspace_folders[0].uri.fsPath
      : ''
  }

  async collect_files(params?: {
    disable_xml?: boolean
    exclude_path?: string
  }): Promise<string> {
    // Get checked files from the file tree provider (which now handles both regular and open files)
    let context_files = this.file_tree_provider.getCheckedFiles()
    let collected_text = ''

    // Process each checked file
    for (const file_path of context_files) {
      if (params?.exclude_path && params.exclude_path == file_path) continue
      try {
        if (!fs.existsSync(file_path)) continue
        const stats = fs.statSync(file_path)

        // Skip directories
        if (stats.isDirectory()) continue

        const content = fs.readFileSync(file_path, 'utf8')

        // Convert absolute path to workspace-relative path
        const relative_path = path.relative(this.workspace_root, file_path)

        if (params?.disable_xml) {
          // Just add the content without XML wrapping, used for context counting so that it matches values shown in file tree
          collected_text += content
        } else {
          // Use XML format with CDATA and workspace-relative path
          collected_text += `<file path="${relative_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
        }
      } catch (error) {
        console.error(`Error reading file ${file_path}:`, error)
      }
    }

    return collected_text
  }
}
