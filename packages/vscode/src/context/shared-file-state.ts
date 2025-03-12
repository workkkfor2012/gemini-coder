import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider, FileItem } from './workspace-provider'
import { OpenEditorsProvider } from './open-editors-provider'

export class SharedFileState {
    private static instance: SharedFileState
    private _onDidChangeCheckedFiles = new vscode.EventEmitter<void>()
    readonly onDidChangeCheckedFiles = this._onDidChangeCheckedFiles.event

    private workspaceProvider?: WorkspaceProvider
    private openEditorsProvider?: OpenEditorsProvider
    private checkedFiles: Set<string> = new Set()
    // Track which view last unchecked a file
    private uncheckedInOpenEditors: Set<string> = new Set()
    private uncheckedInWorkspace: Set<string> = new Set()
    // Track which provider initiated the current synchronization
    private synchronizingProvider: 'workspace' | 'openEditors' | null = null
    // Flag to prevent recursive synchronization
    private isSynchronizing: boolean = false
    // Keep track of the last initialized state
    private isInitialized: boolean = false

    private constructor() {}

    static getInstance(): SharedFileState {
        if (!SharedFileState.instance) {
            SharedFileState.instance = new SharedFileState()
        }
        return SharedFileState.instance
    }

    setProviders(workspaceProvider: WorkspaceProvider, openEditorsProvider: OpenEditorsProvider) {
        this.workspaceProvider = workspaceProvider
        this.openEditorsProvider = openEditorsProvider

        // Listen to changes from both providers
        workspaceProvider.onDidChangeCheckedFiles(() => {
            if (!this.isSynchronizing) {
                this.synchronizingProvider = 'workspace';
                this.synchronizeState();
                this.synchronizingProvider = null;
            }
        });
        
        openEditorsProvider.onDidChangeCheckedFiles(() => {
            if (!this.isSynchronizing) {
                this.synchronizingProvider = 'openEditors';
                this.synchronizeState();
                this.synchronizingProvider = null;
            }
        });

        // Initialize with a synchronization after a small delay to ensure both providers are ready
        setTimeout(() => {
            if (!this.isInitialized) {
                this.synchronizeState();
                this.isInitialized = true;
            }
        }, 1000);
    }

    async synchronizeState() {
        if (!this.workspaceProvider || !this.openEditorsProvider) return;
        if (this.isSynchronizing) return; // Prevent recursive calls
        
        this.isSynchronizing = true;
        
        try {
            // Get checked files from both providers
            const workspaceCheckedFiles = this.workspaceProvider.getCheckedFiles();
            const openEditorsCheckedFiles = this.openEditorsProvider.getCheckedFiles();
            
            // Get all open editor file paths for existence checking
            const openEditorUris = this.getOpenEditorUris();
            const openEditorPaths = openEditorUris.map(uri => uri.fsPath);
            
            // If synchronizing from workspace view
            if (this.synchronizingProvider === 'workspace') {
                // Find all files that need to be updated in open editors view
                for (const file of openEditorPaths) {
                    const isCheckedInWorkspace = this.isFileCheckedInWorkspace(file);
                    const isCheckedInOpenEditors = openEditorsCheckedFiles.includes(file);
                    
                    // If the check states don't match, update the open editors view
                    if (isCheckedInWorkspace !== isCheckedInOpenEditors) {
                        await this.updateFileInOpenEditors(file, isCheckedInWorkspace);
                        
                        // If we're checking the file, remove it from the unchecked tracking
                        if (isCheckedInWorkspace) {
                            this.uncheckedInOpenEditors.delete(file);
                        } else {
                            // Only track as explicitly unchecked if it was checked before
                            if (openEditorsCheckedFiles.includes(file)) {
                                this.uncheckedInOpenEditors.add(file);
                            }
                        }
                    }
                }
            } 
            // If synchronizing from open editors view
            else if (this.synchronizingProvider === 'openEditors') {
                // For each checked file in open editors, ensure it's checked in workspace
                for (const file of openEditorsCheckedFiles) {
                    // If the file isn't checked in workspace, check it
                    if (!workspaceCheckedFiles.includes(file)) {
                        await this.updateFileInWorkspace(file, true);
                        this.uncheckedInWorkspace.delete(file);
                    }
                }
                
                // For each unchecked file in open editors that was previously checked in workspace
                for (const file of openEditorPaths) {
                    if (!openEditorsCheckedFiles.includes(file) && workspaceCheckedFiles.includes(file)) {
                        await this.updateFileInWorkspace(file, false);
                        this.uncheckedInWorkspace.add(file);
                    }
                }
            }
            // If no specific provider triggered the sync, do a full sync
            else {
                // Check all workspace files in open editors view
                for (const file of openEditorPaths) {
                    const isCheckedInWorkspace = this.isFileCheckedInWorkspace(file);
                    const isCheckedInOpenEditors = openEditorsCheckedFiles.includes(file);
                    
                    if (isCheckedInWorkspace !== isCheckedInOpenEditors) {
                        await this.updateFileInOpenEditors(file, isCheckedInWorkspace);
                    }
                }
                
                // Check all open editor files in workspace view
                for (const file of openEditorsCheckedFiles) {
                    if (!workspaceCheckedFiles.includes(file)) {
                        await this.updateFileInWorkspace(file, true);
                    }
                }
            }

            // Update the merged set of checked files for the shared state
            this.updateCheckedFilesSet();
            
            this._onDidChangeCheckedFiles.fire();
        } finally {
            this.isSynchronizing = false;
        }
    }

    // Check if file is checked in workspace, considering parent directories
    private isFileCheckedInWorkspace(filePath: string): boolean {
        if (!this.workspaceProvider) return false;
        
        // Get all checked files from the workspace provider
        const workspaceCheckedFiles = this.workspaceProvider.getCheckedFiles();
        
        // Direct check if the file itself is checked
        if (workspaceCheckedFiles.includes(filePath)) {
            return true;
        }
        
        // Check if any parent directory is checked
        let currentDir = path.dirname(filePath);
        const workspaceRoot = this.workspaceProvider.getWorkspaceRoot();
        
        while (currentDir.startsWith(workspaceRoot)) {
            if (workspaceCheckedFiles.includes(currentDir)) {
                return true;
            }
            // Go up one directory
            currentDir = path.dirname(currentDir);
        }
        
        return false;
    }

    // Get all currently open editor URIs
    private getOpenEditorUris(): vscode.Uri[] {
        const openUris: vscode.Uri[] = [];
        vscode.window.tabGroups.all.forEach(group => {
            group.tabs.forEach(tab => {
                if (tab.input instanceof vscode.TabInputText) {
                    openUris.push(tab.input.uri);
                }
            });
        });
        return openUris;
    }

    // Update a file check state in open editors
    private async updateFileInOpenEditors(filePath: string, checked: boolean): Promise<void> {
        if (!this.openEditorsProvider) return;
        
        const state = checked 
            ? vscode.TreeItemCheckboxState.Checked 
            : vscode.TreeItemCheckboxState.Unchecked;

        // Create a fake FileItem with just enough properties for updateCheckState
        const fakeItem: FileItem = {
            resourceUri: vscode.Uri.file(filePath),
            label: path.basename(filePath),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            isDirectory: false,
            checkboxState: state,
            isGitIgnored: false,
            isSymbolicLink: false,
            isOpenFile: true,
            command: undefined,
            iconPath: undefined,
            tooltip: filePath,
            description: '',
            contextValue: 'openEditor'
        };

        await this.openEditorsProvider.updateCheckState(fakeItem, state);
    }

    // Update a file check state in workspace
    private async updateFileInWorkspace(filePath: string, checked: boolean): Promise<void> {
        if (!this.workspaceProvider || !fs.existsSync(filePath)) return;
        
        const state = checked 
            ? vscode.TreeItemCheckboxState.Checked 
            : vscode.TreeItemCheckboxState.Unchecked;

        // Create a fake FileItem with just enough properties for updateCheckState
        const fakeItem: FileItem = {
            resourceUri: vscode.Uri.file(filePath),
            label: path.basename(filePath),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            isDirectory: false,
            checkboxState: state,
            isGitIgnored: false,
            isSymbolicLink: false,
            isOpenFile: false,
            command: undefined,
            iconPath: undefined,
            tooltip: filePath,
            description: '',
            contextValue: 'file'
        };

        await this.workspaceProvider.updateCheckState(fakeItem, state);
    }

    // Update the merged set of checked files by recalculating from both providers
    private updateCheckedFilesSet() {
        if (!this.workspaceProvider || !this.openEditorsProvider) return;
        
        const workspaceCheckedFiles = this.workspaceProvider.getCheckedFiles();
        const openEditorsCheckedFiles = this.openEditorsProvider.getCheckedFiles();
        
        // Union of both sets
        this.checkedFiles = new Set([...workspaceCheckedFiles, ...openEditorsCheckedFiles]);
    }

    getCheckedFiles(): string[] {
        return Array.from(this.checkedFiles);
    }

    async updateCheckedFile(filePath: string, isChecked: boolean) {
        if (isChecked) {
            this.checkedFiles.add(filePath);
            this.uncheckedInOpenEditors.delete(filePath);
            this.uncheckedInWorkspace.delete(filePath);
        } else {
            this.checkedFiles.delete(filePath);
        }
        
        await this.synchronizeState();
    }

    dispose() {
        this._onDidChangeCheckedFiles.dispose();
    }
}