import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { FileItem } from './workspace-provider'

export class OpenEditorsProvider
  implements vscode.TreeDataProvider<FileItem>, vscode.Disposable
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    FileItem | undefined | null | void
  > = new vscode.EventEmitter<FileItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<
    FileItem | undefined | null | void
  > = this._onDidChangeTreeData.event

  private workspace_root: string
  private checked_items: Map<string, vscode.TreeItemCheckboxState> = new Map()
  private file_token_counts: Map<string, number> = new Map() // Cache token counts
  private tab_change_handler: vscode.Disposable
  private file_change_watcher: vscode.Disposable
  private ignored_extensions: Set<string> = new Set()
  private attach_open_files: boolean = true
  private initialized: boolean = false
  // Track files opened from workspace view
  private opened_from_workspace_view: Set<string> = new Set()
  // Keep track of files we've already attempted to open in non-preview mode
  private non_preview_files: Set<string> = new Set()
  // Track which tabs are currently in preview mode
  private preview_tabs: Map<string, boolean> = new Map()

  constructor(workspace_root: string, ignored_extensions: Set<string>) {
    this.workspace_root = workspace_root
    this.ignored_extensions = ignored_extensions

    // Load user preference for automatically attaching open files
    const config = vscode.workspace.getConfiguration('geminiCoder')
    this.attach_open_files = config.get('attachOpenFiles', true)

    // Initialize the preview tabs map with current tabs
    this.updatePreviewTabsState()

    // Listen for tab changes to update open file checks
    this.tab_change_handler = vscode.window.tabGroups.onDidChangeTabs((e) => {
      this.handleTabChanges(e)
      this.refresh()
    })

    // Listen for file content changes
    this.file_change_watcher = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.isDirty) return // Only process saved changes

      const filePath = e.document.uri.fsPath
      // Clear token count for this file to force recalculation
      this.file_token_counts.delete(filePath)
      this._onDidChangeTreeData.fire()
    })

    // Initial auto-check of all open editors
    // We'll use setTimeout to ensure VS Code has fully loaded editors
    setTimeout(() => {
      this.autoCheckOpenEditors()
      this.initialized = true
      this._onDidChangeTreeData.fire() // Fire event to refresh view
    }, 500) // Small delay to ensure VS Code has loaded all editors
  }

  // New method to update the preview tabs state
  private updatePreviewTabsState(): void {
    // Clear the current state
    this.preview_tabs.clear()

    // Get current state of all tabs
    vscode.window.tabGroups.all.forEach((tabGroup) => {
      tabGroup.tabs.forEach((tab) => {
        if (tab.input instanceof vscode.TabInputText) {
          const uri = tab.input.uri
          this.preview_tabs.set(uri.fsPath, !!tab.isPreview)
        }
      })
    })
  }

  // New method to handle tab changes and detect preview to normal transitions
  private handleTabChanges(e: vscode.TabChangeEvent): void {
    // Process tabs that were changed
    for (const tab of e.changed) {
      // Only track text tabs
      if (tab.input instanceof vscode.TabInputText) {
        const filePath = tab.input.uri.fsPath
        const wasPreview = this.preview_tabs.get(filePath)
        const isNowPreview = !!tab.isPreview

        // If the file was in preview mode and now is not
        if (wasPreview && !isNowPreview) {
          this.handleFileUnpinned(filePath)
        }

        // Update preview state
        this.preview_tabs.set(filePath, isNowPreview)
      }
    }

    // Process tabs that were opened
    for (const tab of e.opened) {
      if (tab.input instanceof vscode.TabInputText) {
        this.preview_tabs.set(tab.input.uri.fsPath, !!tab.isPreview)
      }
    }

    // Remove closed tabs from tracking
    for (const tab of e.closed) {
      if (tab.input instanceof vscode.TabInputText) {
        this.preview_tabs.delete(tab.input.uri.fsPath)
      }
    }
  }

  // Modified method to handle when a file is "unpinned" (goes from preview to normal mode)
  private handleFileUnpinned(filePath: string): void {
    // Only proceed if the setting is enabled
    if (!this.attach_open_files) return

    // Skip files not in workspace
    if (!filePath.startsWith(this.workspace_root)) return

    const extension = path.extname(filePath).toLowerCase().replace('.', '')
    if (this.ignored_extensions.has(extension)) return

    // Skip if already checked
    if (
      this.checked_items.get(filePath) === vscode.TreeItemCheckboxState.Checked
    )
      return

    // Check if this file was opened from workspace view
    const wasOpenedFromWorkspaceView =
      this.opened_from_workspace_view.has(filePath)

    // Remove from tracking set - we'll process it now regardless
    if (wasOpenedFromWorkspaceView) {
      this.opened_from_workspace_view.delete(filePath)
    }

    // Mark as checked when file is unpinned - even if it was opened from workspace view
    this.checked_items.set(filePath, vscode.TreeItemCheckboxState.Checked)

    // Clear token count to recalculate
    this.file_token_counts.delete(filePath)
  }

  // Mark files opened from workspace view
  markOpenedFromWorkspaceView(filePath: string): void {
    this.opened_from_workspace_view.add(filePath)
  }

  public dispose(): void {
    this.tab_change_handler.dispose()
    this.file_change_watcher.dispose() // Dispose the file watcher
  }

  refresh(): void {
    // Clean up closed files from checked_items
    this.cleanUpClosedFiles()

    // Handle newly opened files (this is the new part)
    this.handleNewlyOpenedFiles()

    // Trigger view update
    this._onDidChangeTreeData.fire()
  }

  // Modified method to handle newly opened files
  private handleNewlyOpenedFiles(): void {
    // Only auto-check new files if the setting is enabled
    if (!this.attach_open_files) return

    const openFilePaths = this.getOpenEditors()

    for (const uri of openFilePaths) {
      const filePath = uri.fsPath

      // Skip files not in workspace
      if (!filePath.startsWith(this.workspace_root)) continue

      const extension = path.extname(filePath).toLowerCase().replace('.', '')
      if (this.ignored_extensions.has(extension)) continue

      // Check if this is a new file that isn't in our map yet
      if (!this.checked_items.has(filePath)) {
        // Don't auto-check if the file was opened from workspace view or is in preview mode
        if (
          this.opened_from_workspace_view.has(filePath) ||
          this.preview_tabs.get(filePath)
        ) {
          this.checked_items.set(
            filePath,
            vscode.TreeItemCheckboxState.Unchecked
          )
          // Only remove from set if not in preview mode - keep tracking preview files
          if (!this.preview_tabs.get(filePath)) {
            this.opened_from_workspace_view.delete(filePath)
          }
        } else {
          // Auto-check new files opened through other means and not in preview mode
          this.checked_items.set(filePath, vscode.TreeItemCheckboxState.Checked)
        }

        // Clear token count for this file to force recalculation
        this.file_token_counts.delete(filePath)
      }
    }
  }

  // New method to clean up closed files from workspace view tracking
  private cleanUpClosedFiles(): void {
    const openFilePaths = new Set(
      this.getOpenEditors().map((uri) => uri.fsPath)
    )

    // Filter out entries that are no longer open
    const keysToDelete: string[] = []
    this.checked_items.forEach((state, filePath) => {
      if (!openFilePaths.has(filePath)) {
        keysToDelete.push(filePath)
      }
    })

    // Remove closed files from checked_items
    keysToDelete.forEach((key) => {
      this.checked_items.delete(key)
      // Also remove from workspace view tracking
      this.opened_from_workspace_view.delete(key)
      // Remove from non-preview files tracking
      this.non_preview_files.delete(key)
      // Remove from preview tabs tracking
      this.preview_tabs.delete(key)
    })

    // Clear token count for closed files
    keysToDelete.forEach((key) => {
      this.file_token_counts.delete(key)
    })
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    const key = element.resourceUri.fsPath
    const checkbox_state =
      this.checked_items.get(key) ?? vscode.TreeItemCheckboxState.Unchecked

    element.checkboxState = checkbox_state

    // Get token count and add it to description
    const token_count = element.tokenCount

    if (token_count !== undefined) {
      // Format token count for display (e.g., 1.2k for 1,200)
      const formatted_token_count =
        token_count >= 1000
          ? `${Math.floor(token_count / 1000)}k`
          : `${token_count}`

      // Add token count to description
      if (element.description) {
        element.description = `${formatted_token_count} (${element.description})`
      } else {
        element.description = formatted_token_count
      }
    }

    return element
  }

  async getChildren(): Promise<FileItem[]> {
    if (!this.workspace_root) {
      vscode.window.showInformationMessage('No workspace folder found.')
      return []
    }

    return this.createOpenEditorItems()
  }

  private getOpenEditors(): vscode.Uri[] {
    const open_files: vscode.Uri[] = []

    // Add files from all tab groups
    vscode.window.tabGroups.all.forEach((tabGroup) => {
      tabGroup.tabs.forEach((tab) => {
        if (tab.input instanceof vscode.TabInputText) {
          open_files.push(tab.input.uri)
          // Also update our preview tabs tracking
          this.preview_tabs.set(tab.input.uri.fsPath, !!tab.isPreview)
        }
      })
    })

    return open_files
  }

  // Calculate token count for a file
  private async calculateFileTokens(file_path: string): Promise<number> {
    // Check if we've already calculated this file
    if (this.file_token_counts.has(file_path)) {
      return this.file_token_counts.get(file_path)!
    }

    try {
      // Read file content
      const content = await fs.promises.readFile(file_path, 'utf8')

      // Simple token estimation: character count / 4
      const token_count = Math.floor(content.length / 4)

      // Cache the result
      this.file_token_counts.set(file_path, token_count)

      return token_count
    } catch (error) {
      console.error(`Error calculating tokens for ${file_path}:`, error)
      return 0
    }
  }

  async createOpenEditorItems(): Promise<FileItem[]> {
    const items: FileItem[] = []
    const open_files = this.getOpenEditors()

    for (const file_uri of open_files) {
      const file_path = file_uri.fsPath

      // Skip files not in the workspace
      if (!file_path.startsWith(this.workspace_root)) {
        continue
      }

      const file_name = path.basename(file_path)
      const extension = path.extname(file_path).toLowerCase().replace('.', '')

      // Skip files with ignored extensions
      if (this.ignored_extensions.has(extension)) {
        continue
      }

      // Get checkbox state, respect attach_open_files setting
      let checkbox_state = this.checked_items.get(file_path)
      if (checkbox_state === undefined) {
        const isPreview = this.preview_tabs.get(file_path)
        // Only auto-check if attach_open_files is enabled and file is not in preview mode
        checkbox_state =
          this.attach_open_files && !isPreview
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked
        this.checked_items.set(file_path, checkbox_state)
      }

      // Calculate token count for this file
      const token_count = await this.calculateFileTokens(file_path)

      const item = new FileItem(
        file_name,
        file_uri,
        vscode.TreeItemCollapsibleState.None,
        false, // not a directory
        checkbox_state,
        false, // not git ignored
        false, // not a symlink
        true, // is an open file
        token_count
      )

      items.push(item)
    }

    return items
  }

  // Modified helper method to open a file in non-preview mode without pinning
  private async openFileInNonPreviewMode(uri: vscode.Uri): Promise<void> {
    const filePath = uri.fsPath

    // Skip if we've already tried to open this file in non-preview mode
    if (this.non_preview_files.has(filePath)) {
      return
    }

    // Mark that we've tried to open this file in non-preview mode
    this.non_preview_files.add(filePath)

    try {
      // Open the file in non-preview mode
      await vscode.window.showTextDocument(uri, { preview: false })
    } catch (error) {
      console.error(
        `Error opening file in non-preview mode for ${filePath}:`,
        error
      )
    }
  }

  async updateCheckState(
    item: FileItem,
    state: vscode.TreeItemCheckboxState
  ): Promise<void> {
    const key = item.resourceUri.fsPath
    this.checked_items.set(key, state)

    // Open the file in non-preview mode if it's being checked
    if (state === vscode.TreeItemCheckboxState.Checked) {
      await this.openFileInNonPreviewMode(item.resourceUri)
    }

    this.refresh()
  }

  clearChecks(): void {
    // Instead of clearing the map, explicitly set each open editor to unchecked
    const open_files = this.getOpenEditors()

    for (const uri of open_files) {
      const file_path = uri.fsPath

      // Skip files not in workspace
      if (!file_path.startsWith(this.workspace_root)) continue

      // Explicitly set to unchecked state
      this.checked_items.set(file_path, vscode.TreeItemCheckboxState.Unchecked)
    }

    // Force a complete tree refresh by clearing the file token count cache
    this.file_token_counts.clear()

    // Fire the event with undefined to force full tree refresh
    this._onDidChangeTreeData.fire(undefined)
  }

  async checkAll(): Promise<void> {
    const open_files = this.getOpenEditors()

    for (const uri of open_files) {
      const file_path = uri.fsPath

      // Skip files not in workspace
      if (!file_path.startsWith(this.workspace_root)) continue

      const extension = path.extname(file_path).toLowerCase().replace('.', '')
      if (this.ignored_extensions.has(extension)) continue

      this.checked_items.set(file_path, vscode.TreeItemCheckboxState.Checked)
    }

    // Force a complete tree refresh by clearing the file token count cache
    this.file_token_counts.clear()

    // Fire the event with undefined to force full tree refresh
    this._onDidChangeTreeData.fire(undefined)
  }

  getCheckedFiles(): string[] {
    return Array.from(this.checked_items.entries())
      .filter(
        ([file_path, state]) =>
          state === vscode.TreeItemCheckboxState.Checked &&
          fs.existsSync(file_path) &&
          (fs.lstatSync(file_path).isFile() ||
            fs.lstatSync(file_path).isSymbolicLink())
      )
      .map(([path, _]) => path)
  }

  async setCheckedFiles(file_paths: string[]): Promise<void> {
    // Clear existing checks
    this.checked_items.clear()

    // For each file in filePaths, set its checkboxState to Checked
    for (const file_path of file_paths) {
      if (!fs.existsSync(file_path)) continue

      const extension = path.extname(file_path).toLowerCase().replace('.', '')
      if (this.ignored_extensions.has(extension)) continue

      this.checked_items.set(file_path, vscode.TreeItemCheckboxState.Checked)
    }

    this.refresh()
  }

  // Add this method to the OpenEditorsProvider class
  public updateAttachOpenFilesSetting(value: boolean): void {
    if (this.attach_open_files == value) {
      return
    }
    this.attach_open_files = value
    this.refresh()
  }

  private async autoCheckOpenEditors(): Promise<void> {
    if (!this.attach_open_files) return

    const open_files = this.getOpenEditors()

    for (const uri of open_files) {
      const file_path = uri.fsPath

      // Skip files not in workspace
      if (!file_path.startsWith(this.workspace_root)) continue

      const extension = path.extname(file_path).toLowerCase().replace('.', '')
      if (this.ignored_extensions.has(extension)) continue

      // Check if the file is in preview mode
      const isPreview = this.preview_tabs.get(file_path)

      // Only auto-check if not already set by user and not in preview mode
      if (!this.checked_items.has(file_path) && !isPreview) {
        this.checked_items.set(file_path, vscode.TreeItemCheckboxState.Checked)
      }
    }
  }

  // Method to check if provider is fully initialized
  public isInitialized(): boolean {
    return this.initialized
  }
}
