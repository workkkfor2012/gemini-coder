import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { FileItem } from './workspace-provider'
import { SharedFileState } from '../shared-file-state'
import { ignored_extensions } from '../constants/ignored-extensions'
import { should_ignore_file } from '../utils/extension-utils'
import { WorkspaceProvider } from './workspace-provider'

export class OpenEditorsProvider
  implements vscode.TreeDataProvider<FileItem>, vscode.Disposable
{
  private _on_did_change_tree_data: vscode.EventEmitter<
    FileItem | undefined | null | void
  > = new vscode.EventEmitter<FileItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<
    FileItem | undefined | null | void
  > = this._on_did_change_tree_data.event

  private _workspace_roots: string[] = []
  private _checked_items: Map<string, vscode.TreeItemCheckboxState> = new Map()
  private _file_token_counts: Map<string, number> = new Map() // Cache token counts
  private _tab_change_handler: vscode.Disposable
  private _file_change_watcher: vscode.Disposable
  private _ignored_extensions: Set<string> = new Set()
  private _initialized: boolean = false
  // Track files opened from workspace view
  private _opened_from_workspace_view: Set<string> = new Set()
  // Keep track of files we've already attempted to open in non-preview mode
  private _non_preview_files: Set<string> = new Set()
  // Track which tabs are currently in preview mode
  private _preview_tabs: Map<string, boolean> = new Map()
  private _on_did_change_checked_files = new vscode.EventEmitter<void>()
  readonly onDidChangeCheckedFiles = this._on_did_change_checked_files.event
  // Reference to SharedFileState for checking workspace file states
  private _shared_state: SharedFileState
  private _config_change_handler: vscode.Disposable
  private workspace_provider: WorkspaceProvider

  constructor(
    workspace_folders: vscode.WorkspaceFolder[],
    workspace_provider: WorkspaceProvider
  ) {
    this._workspace_roots = workspace_folders.map((folder) => folder.uri.fsPath)
    this._shared_state = SharedFileState.get_instance()
    this.workspace_provider = workspace_provider

    this._load_ignored_extensions()

    this._update_preview_tabs_state()

    this._tab_change_handler = vscode.window.tabGroups.onDidChangeTabs((e) => {
      this._handle_tab_changes(e)
      this.refresh()
    })

    this._file_change_watcher = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.isDirty) return // Only process saved changes

        const file_path = e.document.uri.fsPath
        // Clear token count for this file to force recalculation
        this._file_token_counts.delete(file_path)
        this._on_did_change_tree_data.fire()
      }
    )

    this._config_change_handler = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration('codeWebChat.ignoredExtensions')) {
          const old_ignored_extensions = new Set(this._ignored_extensions)
          this._load_ignored_extensions()
          this._uncheck_ignored_files(old_ignored_extensions)
          this.refresh()
        }
      }
    )

    // Initial auto-check of all open editors
    // We'll use setTimeout to ensure VS Code has fully loaded editors
    setTimeout(() => {
      this._initialized = true
      this._on_did_change_tree_data.fire()
    }, 500) // Small delay to ensure VS Code has loaded all editors
  }

  private _is_file_in_any_workspace(file_path: string): boolean {
    return this._workspace_roots.some((root) => file_path.startsWith(root))
  }

  private _get_containing_workspace_root(
    file_path: string
  ): string | undefined {
    return this._workspace_roots.find((root) => file_path.startsWith(root))
  }

  private _uncheck_ignored_files(old_ignored_extensions?: Set<string>): void {
    const checked_files = this.get_checked_files()

    // Find files that now match ignored extensions but didn't before
    const files_to_uncheck = checked_files.filter((file_path) => {
      if (old_ignored_extensions) {
        // Only uncheck if it wasn't ignored before but is now
        return (
          !should_ignore_file(file_path, old_ignored_extensions) &&
          should_ignore_file(file_path, this._ignored_extensions)
        )
      }
      // Without old extensions comparison, uncheck all that match current ignored list
      return should_ignore_file(file_path, this._ignored_extensions)
    })

    for (const file_path of files_to_uncheck) {
      this._checked_items.set(file_path, vscode.TreeItemCheckboxState.Unchecked)
    }

    if (files_to_uncheck.length > 0) {
      this._on_did_change_checked_files.fire()
    }
  }

  private _load_ignored_extensions() {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const additional_extensions = config
      .get<string[]>('ignoredExtensions', [])
      .map((ext) => ext.toLowerCase().replace(/^\./, ''))

    this._ignored_extensions = new Set([
      ...ignored_extensions,
      ...additional_extensions
    ])
    // Clear token cache to force recalculation
    this._file_token_counts.clear()
  }

  private _update_preview_tabs_state(): void {
    this._preview_tabs.clear()

    vscode.window.tabGroups.all.forEach((tab_group) => {
      tab_group.tabs.forEach((tab) => {
        if (tab.input instanceof vscode.TabInputText) {
          const uri = tab.input.uri
          this._preview_tabs.set(uri.fsPath, !!tab.isPreview)
        }
      })
    })
  }

  private _handle_tab_changes(e: vscode.TabChangeEvent): void {
    for (const tab of e.changed) {
      if (tab.input instanceof vscode.TabInputText) {
        const file_path = tab.input.uri.fsPath
        const is_now_preview = !!tab.isPreview

        this._preview_tabs.set(file_path, is_now_preview)
      }
    }

    for (const tab of e.opened) {
      if (tab.input instanceof vscode.TabInputText) {
        this._preview_tabs.set(tab.input.uri.fsPath, !!tab.isPreview)
      }
    }

    for (const tab of e.closed) {
      if (tab.input instanceof vscode.TabInputText) {
        this._preview_tabs.delete(tab.input.uri.fsPath)
      }
    }
  }

  mark_opened_from_workspace_view(file_path: string): void {
    this._opened_from_workspace_view.add(file_path)
  }

  dispose(): void {
    this._tab_change_handler.dispose()
    this._file_change_watcher.dispose()
    this._config_change_handler.dispose()
    this._on_did_change_checked_files.dispose()
  }

  refresh(): void {
    this._clean_up_closed_files()
    this._on_did_change_tree_data.fire()
  }

  private _is_file_checked_in_workspace(file_path: string): boolean {
    // Get checked files from workspace provider through SharedFileState
    const workspace_checked_files = this._shared_state.get_checked_files()
    return workspace_checked_files.includes(file_path)
  }

  private _clean_up_closed_files(): void {
    const open_file_paths = new Set(
      this._get_open_editors().map((uri) => uri.fsPath)
    )

    const keys_to_delete: string[] = []
    this._checked_items.forEach((state, file_path) => {
      if (!open_file_paths.has(file_path)) {
        keys_to_delete.push(file_path)
      }
    })

    keys_to_delete.forEach((key) => {
      this._checked_items.delete(key)
      // Also remove from workspace view tracking
      this._opened_from_workspace_view.delete(key)
      // Remove from non-preview files tracking
      this._non_preview_files.delete(key)
      // Remove from preview tabs tracking
      this._preview_tabs.delete(key)
    })

    // Clear token count for closed files
    keys_to_delete.forEach((key) => {
      this._file_token_counts.delete(key)
    })
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    const key = element.resourceUri.fsPath
    const checkbox_state =
      this._checked_items.get(key) ?? vscode.TreeItemCheckboxState.Unchecked

    element.checkboxState = checkbox_state

    const token_count = element.tokenCount

    if (token_count !== undefined) {
      // Format token count for display (e.g., 1.2k for 1,200)
      const formatted_token_count =
        token_count >= 1000
          ? `${Math.floor(token_count / 1000)}k`
          : `${token_count}`

      if (element.description) {
        element.description = `${formatted_token_count} ${element.description}`
      } else {
        element.description = formatted_token_count
      }
    }

    return element
  }

  async getChildren(): Promise<FileItem[]> {
    if (!this._workspace_roots.length) {
      vscode.window.showInformationMessage('No workspace folder found.')
      return []
    }

    return this.create_open_editor_items()
  }

  private _get_open_editors(): vscode.Uri[] {
    // Use a Map to track unique file paths and their URIs
    const open_files_map = new Map<string, vscode.Uri>()

    vscode.window.tabGroups.all.forEach((tab_group) => {
      tab_group.tabs.forEach((tab) => {
        if (tab.input instanceof vscode.TabInputText) {
          const uri = tab.input.uri
          const file_path = uri.fsPath

          if (!open_files_map.has(file_path)) {
            open_files_map.set(file_path, uri)
          }

          // Update preview state regardless
          this._preview_tabs.set(file_path, !!tab.isPreview)
        }
      })
    })

    return Array.from(open_files_map.values())
  }

  // Modified to check all workspace roots and add workspace folder name to description
  async create_open_editor_items(): Promise<FileItem[]> {
    const items: FileItem[] = []
    const open_files = this._get_open_editors()

    for (const file_uri of open_files) {
      const file_path = file_uri.fsPath

      if (!this._is_file_in_any_workspace(file_path)) {
        continue
      }

      const file_name = path.basename(file_path)

      if (should_ignore_file(file_path, this._ignored_extensions)) {
        continue
      }

      let checkbox_state = this._checked_items.get(file_path)

      if (checkbox_state === undefined) {
        // Check if the file is checked in the workspace view
        const is_checked_in_workspace =
          this._is_file_checked_in_workspace(file_path)

        if (is_checked_in_workspace) {
          checkbox_state = vscode.TreeItemCheckboxState.Checked
        } else {
          checkbox_state = vscode.TreeItemCheckboxState.Unchecked
        }

        this._checked_items.set(file_path, checkbox_state)
      }

      const workspace_root = this._get_containing_workspace_root(file_path)
      const relative_path = workspace_root
        ? path.relative(workspace_root, path.dirname(file_path))
        : path.dirname(file_path)

      // Create description with workspace folder name and relative path if multiple workspaces
      let description = relative_path ? `${relative_path}` : ''

      if (this._workspace_roots.length > 1 && workspace_root) {
        const workspace_folder_name = path.basename(workspace_root)
        description = relative_path
          ? `· ${workspace_folder_name}/${relative_path}`
          : workspace_folder_name
      }

      const token_count = await this.workspace_provider.calculate_file_tokens(
        file_path
      )

      const item = new FileItem(
        file_name,
        file_uri,
        vscode.TreeItemCollapsibleState.None,
        false, // not a directory
        checkbox_state,
        false, // isGitIgnored is now irrelevant as we're skipping ignored files
        false, // not a symlink
        true, // is an open file
        token_count,
        undefined, // selectedTokenCount is undefined for open editor files
        description
      )

      items.push(item)
    }

    return items
  }

  // Modified helper method to open a file in non-preview mode without pinning
  private async _open_file_in_non_preview_mode(uri: vscode.Uri): Promise<void> {
    const file_path = uri.fsPath

    // Skip if we've already tried to open this file in non-preview mode
    if (this._non_preview_files.has(file_path)) {
      return
    }

    // Mark that we've tried to open this file in non-preview mode
    this._non_preview_files.add(file_path)

    try {
      await vscode.window.showTextDocument(uri, { preview: false })
    } catch (error) {
      console.error(
        `Error opening file in non-preview mode for ${file_path}:`,
        error
      )
    }
  }

  // Modified updateCheckState method to handle preview mode conversion
  async update_check_state(
    item: FileItem,
    state: vscode.TreeItemCheckboxState
  ): Promise<void> {
    const key = item.resourceUri.fsPath
    this._checked_items.set(key, state)

    // If the checkbox is being checked AND the file is currently in preview mode
    // then convert it to non-preview mode
    if (
      state === vscode.TreeItemCheckboxState.Checked &&
      this._preview_tabs.get(key) === true
    ) {
      await this._open_file_in_non_preview_mode(item.resourceUri)
    }

    this._on_did_change_checked_files.fire()
    this.refresh()
  }

  clear_checks(): void {
    // Instead of clearing the map, explicitly set each open editor to unchecked
    const open_files = this._get_open_editors()

    for (const uri of open_files) {
      const file_path = uri.fsPath

      if (!this._is_file_in_any_workspace(file_path)) continue

      this._checked_items.set(file_path, vscode.TreeItemCheckboxState.Unchecked)
    }

    // Force a complete tree refresh by clearing the file token count cache
    this._file_token_counts.clear()

    // Fire the event with undefined to force full tree refresh
    this._on_did_change_tree_data.fire(undefined)

    // Fire the checked files change event to trigger synchronization with workspace view
    this._on_did_change_checked_files.fire()
  }

  async check_all(): Promise<void> {
    const open_files = this._get_open_editors()

    for (const uri of open_files) {
      const file_path = uri.fsPath

      if (!this._is_file_in_any_workspace(file_path)) continue

      if (should_ignore_file(file_path, this._ignored_extensions)) continue

      this._checked_items.set(file_path, vscode.TreeItemCheckboxState.Checked)

      // If file is in preview mode, convert it to non-preview mode
      if (this._preview_tabs.get(file_path) === true) {
        await this._open_file_in_non_preview_mode(uri)
      }
    }

    // Force a complete tree refresh by clearing the file token count cache
    this._file_token_counts.clear()

    // Fire the event with undefined to force full tree refresh
    this._on_did_change_tree_data.fire(undefined)

    // Fire the checked files change event to trigger synchronization with workspace view
    this._on_did_change_checked_files.fire()
  }

  get_checked_files(): string[] {
    return Array.from(this._checked_items.entries())
      .filter(
        ([file_path, state]) =>
          state === vscode.TreeItemCheckboxState.Checked &&
          fs.existsSync(file_path) &&
          (fs.lstatSync(file_path).isFile() ||
            fs.lstatSync(file_path).isSymbolicLink())
      )
      .map(([path, _]) => path)
  }

  async set_checked_files(file_paths: string[]): Promise<void> {
    this._checked_items.clear()

    for (const file_path of file_paths) {
      if (!fs.existsSync(file_path)) continue

      if (should_ignore_file(file_path, this._ignored_extensions)) continue

      this._checked_items.set(file_path, vscode.TreeItemCheckboxState.Checked)

      // If file is in preview mode, convert it to non-preview mode
      if (this._preview_tabs.get(file_path) === true) {
        await this._open_file_in_non_preview_mode(vscode.Uri.file(file_path))
      }
    }

    this.refresh()

    // Fire the checked files change event to trigger synchronization
    this._on_did_change_checked_files.fire()
  }

  is_initialized(): boolean {
    return this._initialized
  }
}
