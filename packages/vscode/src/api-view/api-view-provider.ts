import * as vscode from 'vscode'

export class ApiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'geminiCoderViewApi'
  private _webview_view: vscode.WebviewView | undefined

  constructor(private readonly _extension_uri: vscode.Uri) {}

  public resolveWebviewView(
    webview_view: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._webview_view = webview_view

    webview_view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extension_uri]
    }

    webview_view.webview.html = this._get_html_for_webview(webview_view.webview)

    // Handle messages from the webview
    webview_view.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'getConfiguration') {
        const config = vscode.workspace.getConfiguration('geminiCoder')
        const providers = config.get('providers', [])
        const defaultFimModel = config.get('defaultFimModel', '')
        const defaultRefactoringModel = config.get('defaultRefactoringModel', '')
        const defaultApplyChangesModel = config.get('defaultApplyChangesModel', '')

        webview_view.webview.postMessage({
          command: 'configuration',
          providers,
          defaultFimModel,
          defaultRefactoringModel,
          defaultApplyChangesModel
        })
      } else if (message.command === 'updateFimModel') {
        await vscode.workspace
          .getConfiguration('geminiCoder')
          .update('defaultFimModel', message.model, true)
      } else if (message.command === 'updateRefactoringModel') {
        await vscode.workspace
          .getConfiguration('geminiCoder')
          .update('defaultRefactoringModel', message.model, true)
      } else if (message.command === 'updateApplyChangesModel') {
        await vscode.workspace
          .getConfiguration('geminiCoder')
          .update('defaultApplyChangesModel', message.model, true)
      }
    })
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'out', 'api.js')
    )

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
          <div id="root"></div>
          <script src="${script_uri}"></script>
      </body>
      </html>
    `
  }
}