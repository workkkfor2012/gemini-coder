import * as vscode from 'vscode'

export class ChatProvider implements vscode.WebviewViewProvider {
  // display lorem ipsum text
  public static readonly viewType = 'geminiCoderViewChat'

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
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
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chat</title>
    </head>
    <body>
        <h1>Chat</h1>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nisl nec ultricies lacinia, nunc nisl tincidunt nunc, eget aliquam nisl nisl vitae nisl. Sed euismod, nisl nec ultricies lacinia, nunc nisl tincidunt nunc, eget aliquam nisl nisl vitae nisl.</p>
    </body>
    </html>`
  }
}
