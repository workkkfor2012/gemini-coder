import * as vscode from 'vscode'

// Define a type for website data based on the message structure
export type Website = {
  url: string
  title: string
  content: string
  favicon?: string
}

// Custom tree item for websites
export class WebsiteItem extends vscode.TreeItem {
  constructor(
    public readonly title: string,
    public readonly url: string,
    public readonly content: string,
    public readonly favicon?: string
  ) {
    super(title, vscode.TreeItemCollapsibleState.None)

    // Set tooltip to show URL on hover
    this.tooltip = url

    // Set description to URL for display in the tree
    this.description = url

    // Set icon based on favicon if available, otherwise use generic icon
    if (favicon) {
      // Use favicon data URI if provided
      this.iconPath = favicon
    } else {
      // Use generic web icon
      this.iconPath = new vscode.ThemeIcon('globe')
    }

    // Add command to preview website content
    this.command = {
      command: 'geminiCoder.previewWebsite',
      title: 'Preview Website Content',
      arguments: [this]
    }

    this.contextValue = 'website'
  }
}

export class WebsitesProvider
  implements vscode.TreeDataProvider<WebsiteItem>, vscode.Disposable
{
  private _websites: Website[] = []
  private _onDidChangeTreeData = new vscode.EventEmitter<
    WebsiteItem | undefined | null | void
  >()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  constructor() {}

  // Update websites from WebSocket message
  updateWebsites(websites: Website[]): void {
    this._websites = websites
    this._onDidChangeTreeData.fire()
  }

  // TreeDataProvider implementation
  getTreeItem(element: WebsiteItem): vscode.TreeItem {
    return element
  }

  getChildren(): Thenable<WebsiteItem[]> {
    return Promise.resolve(
      this._websites.map(
        (website) =>
          new WebsiteItem(
            website.title || website.url,
            website.url,
            website.content,
            website.favicon
          )
      )
    )
  }

  // Returns the number of websites
  getWebsiteCount(): number {
    return this._websites.length
  }

  // Return all website data
  getAllWebsites(): Website[] {
    return [...this._websites]
  }

  // Dispose of event emitters
  dispose(): void {
    this._onDidChangeTreeData.dispose()
  }
}
