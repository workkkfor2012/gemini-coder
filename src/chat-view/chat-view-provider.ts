import * as vscode from 'vscode'

export class ChatViewProvider implements vscode.WebviewViewProvider {
  // show simple input field
  constructor(private readonly _extensionUri: vscode.Uri) {}

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
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js')
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
        <div class="chat-container">
          <div class="chat-messages" id="chat-messages">
          </div>
          <div class="input-area">
            <input type="text" id="chat-input" placeholder="Type your message here...">
            <button id="send-button">Send</button>
          </div>
        </div>
        <script src="${scriptUri}"></script>
      </body>
      </html>
    `
  }
}
