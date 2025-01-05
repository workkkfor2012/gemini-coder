import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export class ChatViewProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly fileTreeProvider: any
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    }

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'copyToClipboard':
          const { instruction } = message

          // Get context from selected files
          let contextText = ''
          const addedFiles = new Set<string>()

          // Add selected files from the file tree
          if (this.fileTreeProvider) {
            const selectedFilesPaths = this.fileTreeProvider.getCheckedFiles()
            for (const filePath of selectedFilesPaths) {
              try {
                const fileContent = fs.readFileSync(filePath, 'utf8')
                const relativePath = path.relative(
                  vscode.workspace.workspaceFolders![0].uri.fsPath,
                  filePath
                )
                contextText += `\n<file path="${relativePath}">\n${fileContent}\n</file>`
                addedFiles.add(filePath)
              } catch (error) {
                console.error(`Error reading file ${filePath}:`, error)
              }
            }
          }

          // Add currently open files
          const openTabs = vscode.window.tabGroups.all
            .flatMap((group) => group.tabs)
            .map((tab) =>
              tab.input instanceof vscode.TabInputText ? tab.input.uri : null
            )
            .filter((uri): uri is vscode.Uri => uri !== null)

          for (const openFileUri of openTabs) {
            const filePath = openFileUri.fsPath
            if (!addedFiles.has(filePath)) {
              try {
                const fileContent = fs.readFileSync(filePath, 'utf8')
                const relativePath = path.relative(
                  vscode.workspace.workspaceFolders![0].uri.fsPath,
                  filePath
                )
                contextText += `\n<file path="${relativePath}">\n${fileContent}\n</file>`
                addedFiles.add(filePath)
              } catch (error) {
                console.error(`Error reading open file ${filePath}:`, error)
              }
            }
          }

          const finalText = `<instruction>${instruction}</instruction>\n<files>${contextText}\n</files>`

          // Copy to clipboard
          await vscode.env.clipboard.writeText(finalText)

          // Notify the user
          vscode.window.showInformationMessage(
            'Instruction with context copied to clipboard!'
          )
          break
        case 'showError':
          vscode.window.showErrorMessage(message.message)
          break
      }
    })
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'chat.js')
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css')
    )

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chat</title>
        <link href="${styleUri}" rel="stylesheet">
      </head>
      <body>
          <div class="input-area">
            <input type="text" id="instruction-input" placeholder="Enter instruction...">
            <button id="send-button">Proceed</button>
          </div>
        <script src="${scriptUri}"></script>
      </body>
      </html>
    `
  }
}
