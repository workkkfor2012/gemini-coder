import * as vscode from 'vscode'
import { ModelManager } from '../services/model-manager'

export class ApiViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'geminiCoderViewApi'
  private _webview_view: vscode.WebviewView | undefined
  private model_manager: ModelManager

  constructor(
    private readonly _extension_uri: vscode.Uri,
    private readonly context: vscode.ExtensionContext
  ) {
    this.model_manager = new ModelManager(context)
  }

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
      if (message.command == 'getConfiguration') {
        const config = vscode.workspace.getConfiguration('geminiCoder')
        const providers = config.get('providers', [])
        const default_fim_model = this.model_manager.get_default_fim_model()
        const default_refactoring_model =
          this.model_manager.get_default_refactoring_model()
        const default_apply_changes_model =
          this.model_manager.get_default_apply_changes_model()

        webview_view.webview.postMessage({
          command: 'configuration',
          providers,
          default_fim_model,
          default_refactoring_model,
          default_apply_changes_model
        })
      } else if (message.command == 'updateFimModel') {
        await this.model_manager.set_default_fim_model(message.model)
      } else if (message.command == 'updateRefactoringModel') {
        await this.model_manager.set_default_refactoring_model(message.model)
      } else if (message.command == 'updateApplyChangesModel') {
        await this.model_manager.set_default_apply_changes_model(message.model)
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
