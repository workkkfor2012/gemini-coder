import * as vscode from 'vscode'

export class ChatViewProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined | null | void
  > = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<
    vscode.TreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!element) {
      // Return the placeholder item when there's no root element
      const placeholderItem = new vscode.TreeItem('Chat feature coming soon!')
      placeholderItem.tooltip = 'This feature is under development.'
      return Promise.resolve([placeholderItem])
    }
    return Promise.resolve([]) // No children for the placeholder
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }
}
