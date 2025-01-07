import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export class ChatViewProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly _extension_uri: vscode.Uri,
    private readonly file_tree_provider: any
  ) {}

  resolveWebviewView(
    webview_view: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webview_view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extension_uri]
    }

    webview_view.webview.html = this._get_html_for_webview(webview_view.webview)

    // Handle messages from the webview
    webview_view.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'copyToClipboard':
          const { instruction } = message

          // Get context from selected files
          let context_text = ''
          const added_files = new Set<string>()

          // Add selected files from the file tree
          if (this.file_tree_provider) {
            const selected_files_paths =
              this.file_tree_provider.getCheckedFiles()
            for (const file_path of selected_files_paths) {
              try {
                const file_content = fs.readFileSync(file_path, 'utf8')
                const relative_path = path.relative(
                  vscode.workspace.workspaceFolders![0].uri.fsPath,
                  file_path
                )
                context_text += `\n<file path="${relative_path}">\n${file_content}\n</file>`
                added_files.add(file_path)
              } catch (error) {
                console.error(`Error reading file ${file_path}:`, error)
              }
            }
          }

          // Add currently open files
          const open_tabs = vscode.window.tabGroups.all
            .flatMap((group) => group.tabs)
            .map((tab) =>
              tab.input instanceof vscode.TabInputText ? tab.input.uri : null
            )
            .filter((uri): uri is vscode.Uri => uri !== null)

          for (const open_file_uri of open_tabs) {
            const file_path = open_file_uri.fsPath
            if (!added_files.has(file_path)) {
              try {
                const file_content = fs.readFileSync(file_path, 'utf8')
                const relative_path = path.relative(
                  vscode.workspace.workspaceFolders![0].uri.fsPath,
                  file_path
                )
                context_text += `\n<file path="${relative_path}">\n${file_content}\n</file>`
                added_files.add(file_path)
              } catch (error) {
                console.error(`Error reading open file ${file_path}:`, error)
              }
            }
          }

          // Get the chat prompt intro from the configuration
          const chat_prompt_intro = vscode.workspace
            .getConfiguration()
            .get<string>('geminiCoder.chatPromptIntro', '')

          // Construct the final text
          const final_text = `${chat_prompt_intro}\n<instruction>\n${instruction}\n</instruction>\n<files>${context_text}</files>`

          await vscode.env.clipboard.writeText(final_text)

          // Open the corresponding URL based on the default chat UI provider
          const chat_ui_provider = vscode.workspace
            .getConfiguration()
            .get<string>('geminiCoder.externalChat')

          let url = ''
          switch (chat_ui_provider) {
            case 'AI Studio':
              url =
                'https://aistudio.google.com/app/prompts/new_chat#gemini-coder'
              break
            case 'DeepSeek':
              url = 'https://chat.deepseek.com/#gemini-coder'
              break
            default:
              url =
                'https://aistudio.google.com/app/prompts/new_chat#gemini-coder'
          }

          vscode.env.openExternal(vscode.Uri.parse(url))
          break

        case 'showError':
          vscode.window.showErrorMessage(message.message)
          break
      }
    })
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'out', 'chat.js')
    )
    const style_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extension_uri, 'media', 'chat.css')
    )

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chat</title>
        <link href="${style_uri}" rel="stylesheet">
      </head>
      <body>
          <div class="input-area">
            <input type="text" id="instruction-input" placeholder="Enter instruction...">
            <button id="send-button">Continue</button>
          </div>
        <script src="${script_uri}"></script>
      </body>
      </html>
    `
  }
}
