import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export class FilesCollector {
  private readonly file_tree_provider: any
  private readonly config: vscode.WorkspaceConfiguration
  private readonly added_files: Set<string> = new Set()
  private context_text: string = ''

  constructor(file_tree_provider: any) {
    this.file_tree_provider = file_tree_provider
    const config = vscode.workspace.getConfiguration()
    this.config = config
  }

  public async collect_files(): Promise<string> {
    const attach_open_files = this.config.get<boolean>(
      'geminiCoder.attachOpenFiles'
    )

    this.context_text = ''
    this.added_files.clear()

    const focused_file = vscode.window.activeTextEditor?.document.uri.fsPath

    try {
      // Collect checked files from file tree provider
      if (this.file_tree_provider) {
        await this._collect_checked_files(focused_file)
      }

      // Collect open files if enabled
      if (attach_open_files) {
        await this._collect_open_files(focused_file)
      }

      return this.context_text ? `<files>${this.context_text}\n</files>` : ''
    } catch (error: any) {
      console.error('Error collecting files:', error)
      throw new Error('Failed to collect files: ' + error.message)
    }
  }

  private async _collect_checked_files(
    focused_file: string | undefined
  ): Promise<void> {
    const selected_files_paths = this.file_tree_provider.getCheckedFiles()
    for (const file_path of selected_files_paths) {
      await this.add_file_to_context(file_path, focused_file)
    }
  }

  private async _collect_open_files(
    focused_file: string | undefined
  ): Promise<void> {
    const open_tabs = vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .map((tab) =>
        tab.input instanceof vscode.TabInputText ? tab.input.uri : null
      )
      .filter((uri): uri is vscode.Uri => uri !== null)

    // First collect non-focused files
    for (const open_file_uri of open_tabs) {
      const file_path = open_file_uri.fsPath
      if (
        file_path != focused_file && // Only process non-focused files first
        !this.added_files.has(file_path)
      ) {
        await this.add_file_to_context(file_path, focused_file)
      }
    }

    // Then add the focused file last (if it exists and should be included)
    if (focused_file && !this.added_files.has(focused_file)) {
      const focused_uri = open_tabs.find((uri) => uri.fsPath === focused_file)
      if (focused_uri) {
        await this.add_file_to_context(focused_file, focused_file)
      }
    }
  }

  private _is_valid_file_content(content: string): boolean {
    // Skip empty files
    if (!content || content.trim().length === 0) {
      return false
    }

    // Skip files that are too large (5MB)
    if (content.length > 5_000_000) {
      return false
    }

    // Skip files with null characters (likely binary)
    const null_char_index = content.indexOf('\0')
    if (null_char_index !== -1) {
      return false
    }

    // Skip files with excessive line length
    const max_line_length = 50000
    if (content.split('\n').some((line) => line.length > max_line_length)) {
      return false
    }

    // Validate UTF-8 encoding
    try {
      Buffer.from(content, 'utf8').toString('utf8')
      return true
    } catch {
      return false
    }
  }

  private async add_file_to_context(
    file_path: string,
    focused_file: string | undefined
  ): Promise<void> {
    try {
      const file_content = fs.readFileSync(file_path, 'utf8')

      // Validate file content
      if (!this._is_valid_file_content(file_content)) {
        console.warn(
          `Skipping file ${file_path}: Invalid content (empty, too large, binary or invalid encoding)`
        )
        return
      }

      const relative_path = path.relative(
        vscode.workspace.workspaceFolders![0].uri.fsPath,
        file_path
      )

      const focused_attr = file_path == focused_file ? ' focused' : ''

      this.context_text += `\n<file path="${relative_path}"${focused_attr}>\n<![CDATA[\n${file_content}\n]]>\n</file>`
      this.added_files.add(file_path)
    } catch (error: any) {
      const error_message = `Error reading file ${file_path}: ${error.message}`
      console.error(error_message)
    }
  }
}
