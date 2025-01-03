import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import ignore from 'ignore'

export class FileTreeProvider
  implements vscode.TreeDataProvider<FileItem>, vscode.Disposable
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    FileItem | undefined | null | void
  > = new vscode.EventEmitter<FileItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<
    FileItem | undefined | null | void
  > = this._onDidChangeTreeData.event
  private workspaceRoot: string
  private checkedItems: Map<string, vscode.TreeItemCheckboxState> = new Map()
  private combinedGitignore = ignore() // To hold all .gitignore rules
  private ignoredExtensions: Set<string> = new Set()
  private watcher: vscode.FileSystemWatcher
  private gitignoreWatcher: vscode.FileSystemWatcher

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot
    this.loadAllGitignoreFiles() // Load all .gitignore files on initialization
    this.loadIgnoredExtensions()

    // Create a file system watcher for general file changes
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*')
    this.watcher.onDidCreate(() => this.handleFileCreate())
    this.watcher.onDidDelete(this.onFileSystemChanged)
    this.watcher.onDidChange(this.onFileSystemChanged)

    // Watch for .gitignore changes specifically
    this.gitignoreWatcher =
      vscode.workspace.createFileSystemWatcher('**/.gitignore')
    this.gitignoreWatcher.onDidCreate(() => this.loadAllGitignoreFiles())
    this.gitignoreWatcher.onDidChange(() => this.loadAllGitignoreFiles())
    this.gitignoreWatcher.onDidDelete(() => this.loadAllGitignoreFiles())

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('geminiCoder.ignoredExtensions')) {
        this.loadIgnoredExtensions()
        this.refresh()
      }
    })
  }

  public dispose(): void {
    this.watcher.dispose()
    this.gitignoreWatcher.dispose()
  }

  private onFileSystemChanged(): void {
    this.refresh()
  }

  private async handleFileCreate(): Promise<void> {
    // Refresh the tree view
    await this.refresh()

    // If a new file is created within a checked directory, check it automatically
    for (const [dirPath] of this.checkedItems) {
      if (
        this.checkedItems.get(dirPath) === vscode.TreeItemCheckboxState.Checked
      ) {
        const relativePath = path.relative(this.workspaceRoot, dirPath)
        const isExcluded = this.isExcluded(relativePath)

        await this.updateDirectoryCheckState(
          dirPath,
          vscode.TreeItemCheckboxState.Checked,
          isExcluded
        )
      }
    }
  }

  async refresh(): Promise<void> {
    this._onDidChangeTreeData.fire()
  }

  clearChecks(): void {
    this.checkedItems.clear()
    this.refresh()
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    const key = element.resourceUri.fsPath
    const checkboxState =
      this.checkedItems.get(key) ?? vscode.TreeItemCheckboxState.Unchecked
    element.checkboxState = checkboxState
    return element
  }

  async getChildren(element?: FileItem): Promise<FileItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No workspace folder found.')
      return []
    }
    const dirPath = element ? element.resourceUri.fsPath : this.workspaceRoot
    return this.getFilesAndDirectories(dirPath)
  }

  private async getFilesAndDirectories(dirPath: string): Promise<FileItem[]> {
    const items: FileItem[] = []
    try {
      const dirEntries = await fs.promises.readdir(dirPath, {
        withFileTypes: true
      })

      // Sort directories above files and alphabetically
      dirEntries.sort((a, b) => {
        const aIsDir = a.isDirectory() || a.isSymbolicLink()
        const bIsDir = b.isDirectory() || b.isSymbolicLink()
        if (aIsDir && !bIsDir) return -1
        if (!aIsDir && bIsDir) return 1
        return a.name.localeCompare(b.name)
      })

      for (const entry of dirEntries) {
        const fullPath = path.join(dirPath, entry.name)
        const relativePath = path.relative(this.workspaceRoot, fullPath)
        const uri = vscode.Uri.file(fullPath)
        let isDirectory = entry.isDirectory()
        let isSymbolicLink = entry.isSymbolicLink()
        let isBrokenLink = false

        if (isSymbolicLink) {
          try {
            const stats = await fs.promises.stat(fullPath)
            isDirectory = stats.isDirectory()
          } catch (err) {
            // The symlink is broken
            isBrokenLink = true
          }
        }

        // Skip broken symlinks
        if (isBrokenLink) {
          continue
        }

        // Skip if excluded by .gitignore or other rules
        if (this.isExcluded(relativePath)) {
          continue
        }

        const extension = path
          .extname(entry.name)
          .toLowerCase()
          .replace('.', '')
        const isIgnoredExtension = this.ignoredExtensions.has(extension)
        const key = fullPath

        let checkboxState = this.checkedItems.get(key)
        if (checkboxState === undefined) {
          const parentPath = path.dirname(fullPath)
          const parentCheckboxState = this.checkedItems.get(parentPath)
          if (
            parentCheckboxState === vscode.TreeItemCheckboxState.Checked &&
            !isIgnoredExtension
          ) {
            checkboxState = vscode.TreeItemCheckboxState.Checked
            this.checkedItems.set(fullPath, checkboxState)
          } else {
            checkboxState = vscode.TreeItemCheckboxState.Unchecked
          }
        }

        const item = new FileItem(
          entry.name,
          uri,
          isDirectory
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          isDirectory,
          checkboxState,
          false, // isGitIgnored is no longer used directly for filtering
          isSymbolicLink
        )
        items.push(item)
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error)
    }
    return items
  }

  async updateCheckState(
    item: FileItem,
    state: vscode.TreeItemCheckboxState
  ): Promise<void> {
    const key = item.resourceUri.fsPath
    this.checkedItems.set(key, state)
    if (item.isDirectory) {
      const relativePath = path.relative(this.workspaceRoot, key)
      const isExcluded = this.isExcluded(relativePath)
      await this.updateDirectoryCheckState(key, state, isExcluded)
    }

    // Update parent directories' states
    let dirPath = path.dirname(key)
    while (dirPath.startsWith(this.workspaceRoot)) {
      await this.updateParentState(dirPath)
      dirPath = path.dirname(dirPath)
    }

    this.refresh()
  }

  private async updateParentState(dirPath: string): Promise<void> {
    try {
      const dirEntries = await fs.promises.readdir(dirPath, {
        withFileTypes: true
      })

      let allChecked = true
      let hasNonIgnoredChild = false

      for (const entry of dirEntries) {
        const siblingPath = path.join(dirPath, entry.name)
        const relativePath = path.relative(this.workspaceRoot, siblingPath)
        const extension = path
          .extname(entry.name)
          .toLowerCase()
          .replace('.', '')
        const isIgnoredExtension = this.ignoredExtensions.has(extension)

        // Check if the child is excluded
        if (this.isExcluded(relativePath) || isIgnoredExtension) {
          continue
        }

        hasNonIgnoredChild = true
        const state =
          this.checkedItems.get(siblingPath) ??
          vscode.TreeItemCheckboxState.Unchecked

        if (state !== vscode.TreeItemCheckboxState.Checked) {
          allChecked = false
          break
        }
      }

      if (hasNonIgnoredChild) {
        if (allChecked) {
          this.checkedItems.set(dirPath, vscode.TreeItemCheckboxState.Checked)
        } else {
          this.checkedItems.set(dirPath, vscode.TreeItemCheckboxState.Unchecked)
        }
      } else {
        // If no non-ignored children, set parent to unchecked
        this.checkedItems.set(dirPath, vscode.TreeItemCheckboxState.Unchecked)
      }
    } catch (error) {
      console.error(`Error updating parent state for ${dirPath}:`, error)
    }
  }

  private async updateDirectoryCheckState(
    dirPath: string,
    state: vscode.TreeItemCheckboxState,
    parentIsExcluded: boolean
  ): Promise<void> {
    try {
      const dirEntries = await fs.promises.readdir(dirPath, {
        withFileTypes: true
      })

      for (const entry of dirEntries) {
        const fullPath = path.join(dirPath, entry.name)
        const relativePath = path.relative(this.workspaceRoot, fullPath)
        const extension = path
          .extname(entry.name)
          .toLowerCase()
          .replace('.', '')
        const isIgnoredExtension = this.ignoredExtensions.has(extension)

        // Skip if parent is excluded or if the item itself is excluded
        if (
          parentIsExcluded ||
          this.isExcluded(relativePath) ||
          isIgnoredExtension
        ) {
          continue
        }

        this.checkedItems.set(fullPath, state)

        let isDirectory = entry.isDirectory()
        let isSymbolicLink = entry.isSymbolicLink()
        let isBrokenLink = false

        if (isSymbolicLink) {
          try {
            const stats = await fs.promises.stat(fullPath)
            isDirectory = stats.isDirectory()
          } catch (err) {
            // The symlink is broken
            isBrokenLink = true
          }
        }

        if (isDirectory && !isBrokenLink) {
          await this.updateDirectoryCheckState(fullPath, state, false) // false because the child is not excluded if we reached here
        }
      }
    } catch (error) {
      console.error(
        `Error updating directory check state for ${dirPath}:`,
        error
      )
    }
  }

  getCheckedFiles(): string[] {
    return Array.from(this.checkedItems.entries())
      .filter(
        ([filePath, state]) =>
          state === vscode.TreeItemCheckboxState.Checked &&
          fs.existsSync(filePath) &&
          (fs.lstatSync(filePath).isFile() ||
            fs.lstatSync(filePath).isSymbolicLink()) &&
          !this.isExcluded(path.relative(this.workspaceRoot, filePath))
      )
      .map(([path, _]) => path)
  }

  public async setCheckedFiles(filePaths: string[]): Promise<void> {
    // Clear existing checks
    this.checkedItems.clear()

    // For each file in filePaths, set its checkboxState to Checked
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        this.checkedItems.set(filePath, vscode.TreeItemCheckboxState.Checked)
      }
    }

    // Update parent directories' checkbox states
    for (const filePath of filePaths) {
      let dirPath = path.dirname(filePath)
      while (dirPath.startsWith(this.workspaceRoot)) {
        await this.updateParentState(dirPath)
        dirPath = path.dirname(dirPath)
      }
    }

    this.refresh()
  }

  // Load .gitignore from all levels of the workspace
  private async loadAllGitignoreFiles(): Promise<void> {
    const gitignoreFiles = await vscode.workspace.findFiles('**/.gitignore')
    this.combinedGitignore = ignore() // Reset

    for (const fileUri of gitignoreFiles) {
      const gitignorePath = fileUri.fsPath
      const relativeGitignorePath = path.relative(
        this.workspaceRoot,
        path.dirname(gitignorePath)
      )

      try {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
        const rulesWithPrefix = gitignoreContent
          .split('\n')
          .map((rule) => rule.trim())
          .filter((rule) => rule && !rule.startsWith('#'))
          .map((rule) =>
            relativeGitignorePath === ''
              ? rule
              : `${relativeGitignorePath}/${rule}`
          ) // Prefix rules with relative path

        this.combinedGitignore.add(rulesWithPrefix)
      } catch (error) {
        console.error(
          `Error reading .gitignore file at ${gitignorePath}:`,
          error
        )
      }
    }

    // Add default exclusions (e.g., node_modules at the root)
    this.combinedGitignore.add(['node_modules/'])

    this.refresh()
  }

  private isExcluded(relativePath: string): boolean {
    return (
      this.combinedGitignore.ignores(relativePath) ||
      this.ignoredExtensions.has(
        path.extname(relativePath).toLowerCase().replace('.', '')
      )
    )
  }

  private loadIgnoredExtensions() {
    const config = vscode.workspace.getConfiguration('geminiCoder')
    const extensionsString = config.get<string>(
      'ignoredExtensions',
      'png,jpg,jpeg,gif,svg'
    )
    const extensionsArray = extensionsString
      .split(',')
      .map((ext) => ext.trim().toLowerCase())
    this.ignoredExtensions = new Set(extensionsArray)
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
