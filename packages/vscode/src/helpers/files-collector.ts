import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { FileTreeProvider } from '../file-tree/file-tree-provider'

export class FilesCollector {
  private file_tree_provider: FileTreeProvider

  constructor(file_tree_provider: FileTreeProvider) {
    this.file_tree_provider = file_tree_provider
  }

  async collect_files(): Promise<string> {
    // Get checked files from the file tree provider (which now handles both regular and open files)
    let context_files = this.file_tree_provider.getCheckedFiles()
    let collected_text = ''

    // Process each checked file
    for (const file_path of context_files) {
      try {
        if (!fs.existsSync(file_path)) continue
        const stats = fs.statSync(file_path)

        // Skip directories
        if (stats.isDirectory()) continue

        const content = fs.readFileSync(file_path, 'utf8')
        const filename = path.basename(file_path)

        collected_text += `<file path="${file_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
      } catch (error) {
        console.error(`Error reading file ${file_path}:`, error)
      }
    }

    return collected_text
  }
}