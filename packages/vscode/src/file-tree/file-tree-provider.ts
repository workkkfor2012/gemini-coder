import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import ignore from 'ignore'

export class FileTreeProvider
  implements vscode.TreeDataProvider<FileItem>, vscode.Disposable
{
  private _on_did_change_tree_data: vscode.EventEmitter<
    FileItem | undefined | null | void
  > = new vscode.EventEmitter<FileItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<
    FileItem | undefined | null | void
  > = this._on_did_change_tree_data.event
  private workspace_root: string
  private checked_items: Map<string, vscode.TreeItemCheckboxState> = new Map()
  private combined_gitignore = ignore() // To hold all .gitignore rules
  private ignored_extensions: Set<string> = new Set()
  private watcher: vscode.FileSystemWatcher
  private gitignore_watcher: vscode.FileSystemWatcher

  constructor(workspace_root: string) {
    this.workspace_root = workspace_root
    this.load_all_gitignore_files() // Load all .gitignore files on initialization
    this.load_ignored_extensions()

    // Create a file system watcher for general file changes
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*')
    this.watcher.onDidCreate(() => this.handle_file_create())
    this.watcher.onDidDelete(this.on_file_system_changed)
    this.watcher.onDidChange(this.on_file_system_changed)

    // Watch for .gitignore changes specifically
    this.gitignore_watcher =
      vscode.workspace.createFileSystemWatcher('**/.gitignore')
    this.gitignore_watcher.onDidCreate(() => this.load_all_gitignore_files())
    this.gitignore_watcher.onDidChange(() => this.load_all_gitignore_files())
    this.gitignore_watcher.onDidDelete(() => this.load_all_gitignore_files())

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('geminiCoder.ignoredExtensions')) {
        this.load_ignored_extensions()
        this.refresh()
      }
    })
  }

  public dispose(): void {
    this.watcher.dispose()
    this.gitignore_watcher.dispose()
  }

  private on_file_system_changed(): void {
    this.refresh()
  }

  private async handle_file_create(): Promise<void> {
    // Refresh the tree view
    await this.refresh()

    // If a new file is created within a checked directory, check it automatically
    for (const [dir_path] of this.checked_items) {
      if (
        this.checked_items.get(dir_path) ===
        vscode.TreeItemCheckboxState.Checked
      ) {
        const relative_path = path.relative(this.workspace_root, dir_path)
        const is_excluded = this.is_excluded(relative_path)

        await this.update_directory_check_state(
          dir_path,
          vscode.TreeItemCheckboxState.Checked,
          is_excluded
        )
      }
    }
  }

  async refresh(): Promise<void> {
    this._on_did_change_tree_data.fire()
  }

  clearChecks(): void {
    this.checked_items.clear()
    this.refresh()
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    const key = element.resourceUri.fsPath
    const checkbox_state =
      this.checked_items.get(key) ?? vscode.TreeItemCheckboxState.Unchecked
    element.checkboxState = checkbox_state
    return element
  }

  async getChildren(element?: FileItem): Promise<FileItem[]> {
    if (!this.workspace_root) {
      vscode.window.showInformationMessage('No workspace folder found.')
      return []
    }
    const dir_path = element ? element.resourceUri.fsPath : this.workspace_root
    return this.get_files_and_directories(dir_path)
  }

  private async get_files_and_directories(
    dir_path: string
  ): Promise<FileItem[]> {
    const items: FileItem[] = []
    try {
      const dir_entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })

      // Sort directories above files and alphabetically
      dir_entries.sort((a, b) => {
        const a_is_dir = a.isDirectory() || a.isSymbolicLink()
        const b_is_dir = b.isDirectory() || b.isSymbolicLink()
        if (a_is_dir && !b_is_dir) return -1
        if (!a_is_dir && b_is_dir) return 1
        return a.name.localeCompare(b.name)
      })

      for (const entry of dir_entries) {
        const full_path = path.join(dir_path, entry.name)
        const relative_path = path.relative(this.workspace_root, full_path)
        const uri = vscode.Uri.file(full_path)
        let is_directory = entry.isDirectory()
        let is_symbolic_link = entry.isSymbolicLink()
        let is_broken_link = false

        if (is_symbolic_link) {
          try {
            const stats = await fs.promises.stat(full_path)
            is_directory = stats.isDirectory()
          } catch (err) {
            // The symlink is broken
            is_broken_link = true
          }
        }

        // Skip broken symlinks
        if (is_broken_link) {
          continue
        }

        // Skip if excluded by .gitignore or other rules
        if (this.is_excluded(relative_path)) {
          continue
        }

        const extension = path
          .extname(entry.name)
          .toLowerCase()
          .replace('.', '')
        const is_ignored_extension = this.ignored_extensions.has(extension)
        const key = full_path

        let checkbox_state = this.checked_items.get(key)
        if (checkbox_state === undefined) {
          const parent_path = path.dirname(full_path)
          const parent_checkbox_state = this.checked_items.get(parent_path)
          if (
            parent_checkbox_state === vscode.TreeItemCheckboxState.Checked &&
            !is_ignored_extension
          ) {
            checkbox_state = vscode.TreeItemCheckboxState.Checked
            this.checked_items.set(full_path, checkbox_state)
          } else {
            checkbox_state = vscode.TreeItemCheckboxState.Unchecked
          }
        }

        const item = new FileItem(
          entry.name,
          uri,
          is_directory
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          is_directory,
          checkbox_state,
          false, // isGitIgnored is no longer used directly for filtering
          is_symbolic_link
        )
        items.push(item)
      }
    } catch (error) {
      console.error(`Error reading directory ${dir_path}:`, error)
    }
    return items
  }

  async updateCheckState(
    item: FileItem,
    state: vscode.TreeItemCheckboxState
  ): Promise<void> {
    const key = item.resourceUri.fsPath
    this.checked_items.set(key, state)
    if (item.isDirectory) {
      const relative_path = path.relative(this.workspace_root, key)
      const is_excluded = this.is_excluded(relative_path)
      await this.update_directory_check_state(key, state, is_excluded)
    }

    // Update parent directories' states
    let dir_path = path.dirname(key)
    while (dir_path.startsWith(this.workspace_root)) {
      await this.update_parent_state(dir_path)
      dir_path = path.dirname(dir_path)
    }

    this.refresh()
  }

  private async update_parent_state(dir_path: string): Promise<void> {
    try {
      const dir_entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })

      let all_checked = true
      let has_non_ignored_child = false

      for (const entry of dir_entries) {
        const sibling_path = path.join(dir_path, entry.name)
        const relative_path = path.relative(this.workspace_root, sibling_path)
        const extension = path
          .extname(entry.name)
          .toLowerCase()
          .replace('.', '')
        const is_ignored_extension = this.ignored_extensions.has(extension)

        // Check if the child is excluded
        if (this.is_excluded(relative_path) || is_ignored_extension) {
          continue
        }

        has_non_ignored_child = true
        const state =
          this.checked_items.get(sibling_path) ??
          vscode.TreeItemCheckboxState.Unchecked

        if (state !== vscode.TreeItemCheckboxState.Checked) {
          all_checked = false
          break
        }
      }

      if (has_non_ignored_child) {
        if (all_checked) {
          this.checked_items.set(dir_path, vscode.TreeItemCheckboxState.Checked)
        } else {
          this.checked_items.set(
            dir_path,
            vscode.TreeItemCheckboxState.Unchecked
          )
        }
      } else {
        // If no non-ignored children, set parent to unchecked
        this.checked_items.set(dir_path, vscode.TreeItemCheckboxState.Unchecked)
      }
    } catch (error) {
      console.error(`Error updating parent state for ${dir_path}:`, error)
    }
  }

  private async update_directory_check_state(
    dir_path: string,
    state: vscode.TreeItemCheckboxState,
    parent_is_excluded: boolean
  ): Promise<void> {
    try {
      const dir_entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })

      for (const entry of dir_entries) {
        const full_path = path.join(dir_path, entry.name)
        const relative_path = path.relative(this.workspace_root, full_path)
        const extension = path
          .extname(entry.name)
          .toLowerCase()
          .replace('.', '')
        const is_ignored_extension = this.ignored_extensions.has(extension)

        // Skip if parent is excluded or if the item itself is excluded
        if (
          parent_is_excluded ||
          this.is_excluded(relative_path) ||
          is_ignored_extension
        ) {
          continue
        }

        this.checked_items.set(full_path, state)

        let is_directory = entry.isDirectory()
        let is_symbolic_link = entry.isSymbolicLink()
        let is_broken_link = false

        if (is_symbolic_link) {
          try {
            const stats = await fs.promises.stat(full_path)
            is_directory = stats.isDirectory()
          } catch (err) {
            // The symlink is broken
            is_broken_link = true
          }
        }

        if (is_directory && !is_broken_link) {
          await this.update_directory_check_state(full_path, state, false) // false because the child is not excluded if we reached here
        }
      }
    } catch (error) {
      console.error(
        `Error updating directory check state for ${dir_path}:`,
        error
      )
    }
  }

  getCheckedFiles(): string[] {
    return Array.from(this.checked_items.entries())
      .filter(
        ([file_path, state]) =>
          state === vscode.TreeItemCheckboxState.Checked &&
          fs.existsSync(file_path) &&
          (fs.lstatSync(file_path).isFile() ||
            fs.lstatSync(file_path).isSymbolicLink()) &&
          !this.is_excluded(path.relative(this.workspace_root, file_path))
      )
      .map(([path, _]) => path)
  }

  public async setCheckedFiles(file_paths: string[]): Promise<void> {
    // Clear existing checks
    this.checked_items.clear()

    // For each file in filePaths, set its checkboxState to Checked
    for (const file_path of file_paths) {
      if (fs.existsSync(file_path)) {
        this.checked_items.set(file_path, vscode.TreeItemCheckboxState.Checked)
      }
    }

    // Update parent directories' checkbox states
    for (const file_path of file_paths) {
      let dir_path = path.dirname(file_path)
      while (dir_path.startsWith(this.workspace_root)) {
        await this.update_parent_state(dir_path)
        dir_path = path.dirname(dir_path)
      }
    }

    this.refresh()
  }

  // Load .gitignore from all levels of the workspace
  private async load_all_gitignore_files(): Promise<void> {
    const gitignore_files = await vscode.workspace.findFiles('**/.gitignore')
    this.combined_gitignore = ignore() // Reset

    for (const file_uri of gitignore_files) {
      const gitignore_path = file_uri.fsPath
      const relative_gitignore_path = path.relative(
        this.workspace_root,
        path.dirname(gitignore_path)
      )

      try {
        const gitignore_content = fs.readFileSync(gitignore_path, 'utf-8')
        const rules_with_prefix = gitignore_content
          .split('\n')
          .map((rule) => rule.trim())
          .filter((rule) => rule && !rule.startsWith('#'))
          .map((rule) =>
            relative_gitignore_path === ''
              ? rule
              : `${relative_gitignore_path}${
                  rule.startsWith('/') ? rule : `/${rule}`
                }`
          )

        this.combined_gitignore.add(rules_with_prefix)
      } catch (error) {
        console.error(
          `Error reading .gitignore file at ${gitignore_path}:`,
          error
        )
      }
    }

    // Add default exclusions (e.g., node_modules at the root)
    this.combined_gitignore.add(['node_modules/'])

    this.refresh()
  }

  private is_excluded(relative_path: string): boolean {
    return (
      this.combined_gitignore.ignores(relative_path) ||
      this.ignored_extensions.has(
        path.extname(relative_path).toLowerCase().replace('.', '')
      )
    )
  }

  private load_ignored_extensions() {
    const config = vscode.workspace.getConfiguration('geminiCoder')
    const extensions_string = config.get<string>(
      'ignoredExtensions',
      'png,jpg,jpeg,gif,svg'
    )
    const extensions_array = extensions_string
      .split(',')
      .map((ext) => ext.trim().toLowerCase())
    this.ignored_extensions = new Set(extensions_array)
  }
}

export class FileItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public isDirectory: boolean,
    public checkboxState: vscode.TreeItemCheckboxState,
    public isGitIgnored: boolean,
    public isSymbolicLink: boolean = false
  ) {
    super(label, collapsibleState)
    this.tooltip = this.resourceUri.fsPath
    this.iconPath = new vscode.ThemeIcon(this.isDirectory ? 'folder' : 'file')
    this.checkboxState = checkboxState

    if (this.isSymbolicLink) {
      // Optionally, you can adjust the icon or label to indicate a symlink
      this.description = this.description
        ? this.description + ' (symlink)'
        : '(symlink)'
    }
  }
}
