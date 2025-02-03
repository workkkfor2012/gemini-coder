import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'geminiCoderViewChat'
  private _webview_view: vscode.WebviewView | undefined

  constructor(
    private readonly _extension_uri: vscode.Uri,
    private readonly file_tree_provider: any,
    private readonly _context: vscode.ExtensionContext
  ) {}

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
      const additional_web_chats = vscode.workspace
        .getConfiguration()
        .get<any[]>('geminiCoder.additionalWebChats', [])

      let last_used_web_chats = this._context.globalState.get<string[]>(
        'lastUsedWebChats',
        []
      )
      if (!last_used_web_chats.includes('AI Studio')) {
        last_used_web_chats.push('AI Studio')
      }
      last_used_web_chats = last_used_web_chats.filter(
        (web_chat) =>
          web_chat == 'AI Studio' ||
          additional_web_chats.some((item) => item.name == web_chat)
      )
      additional_web_chats.forEach((chat) => {
        if (!last_used_web_chats.includes(chat.name)) {
          last_used_web_chats.push(chat.name)
        }
      })
      this._context.globalState.update('lastUsedWebChats', last_used_web_chats)

      switch (message.command) {
        case 'getlastChatPrompt':
          const last_instruction =
            this._context.globalState.get<string>('lastChatPrompt') || ''
          webview_view.webview.postMessage({
            command: 'initialInstruction',
            instruction: last_instruction
          })
          break

        case 'saveChatInstruction':
          this._context.globalState.update(
            'lastChatPrompt',
            message.instruction
          )
          break
        case 'getSystemInstructions':
          const system_instructions = vscode.workspace
            .getConfiguration()
            .get<string[]>('geminiCoder.systemInstructions', [])
          webview_view.webview.postMessage({
            command: 'systemInstructions',
            instructions: system_instructions
          })
          break
        case 'processChatInstruction':
          // Get context from selected files
          let context = ''
          const added_files = new Set<string>()

          const focused_file =
            vscode.window.activeTextEditor?.document.uri.fsPath

          const set_focused_attribute = vscode.workspace
            .getConfiguration()
            .get<boolean>('geminiCoder.setFocusedAttribute', true)

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

                const focused_attr =
                  set_focused_attribute && file_path == focused_file
                    ? ' focused="true"'
                    : ''
                context += `\n<file path="${relative_path}"${focused_attr}>\n<![CDATA[\n${file_content}\n]]>\n</file>`
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

                const focused_attr =
                  set_focused_attribute && file_path == focused_file
                    ? ' focused="true"'
                    : ''
                context += `\n<file path="${relative_path}"${focused_attr}>\n<![CDATA[\n${file_content}\n]]>\n</file>`
                added_files.add(file_path)
              } catch (error) {
                console.error(`Error reading open file ${file_path}:`, error)
              }
            }
          }

          // Get selected system instruction from webview state
          const system_instruction = message.system_instruction
          const prompt_prefix = message.prompt_prefix
          const prompt_suffix = message.prompt_suffix
          if (prompt_prefix) {
            message.instruction = `${prompt_prefix.trim()} ${
              message.instruction
            }`
          }

          if (prompt_suffix) {
            message.instruction = `${
              message.instruction
            } ${prompt_suffix.trim()}`
          }

          const ai_studio_temperature = vscode.workspace
            .getConfiguration()
            .get<number>('geminiCoder.aiStudioTemperature')

          const ai_studio_model = vscode.workspace
            .getConfiguration()
            .get<string>('geminiCoder.aiStudioModel')

          // Construct the final text
          let clipboard_text = `${
            context ? `<files>${context}\n</files>\n` : ''
          }${message.instruction}`

          // clipboard_text = `<model>${ai_studio_model}</model><temperature>${ai_studio_temperature}</temperature>${clipboard_text}`
          clipboard_text = `<model>${ai_studio_model}</model>${clipboard_text}`
          if (system_instruction) {
            clipboard_text = `<system>${system_instruction}</system>${clipboard_text}`
          }

          await vscode.env.clipboard.writeText(clipboard_text)

          let selected_chat = last_used_web_chats[0] || 'AI Studio'

          if (selected_chat) {
            const chat_url =
              selected_chat == 'AI Studio'
                ? 'https://aistudio.google.com/app/prompts/new_chat'
                : additional_web_chats.find(
                    (chat) => chat.name == selected_chat
                  )?.url

            if (chat_url) {
              vscode.env.openExternal(
                vscode.Uri.parse(`${chat_url}#gemini-coder`)
              )
            } else {
              vscode.window.showErrorMessage(
                `URL not found for web chat: ${selected_chat}`
              )
            }
          } else {
            // If no chat is selected, do nothing
            return
          }

          break
        case 'showError':
          vscode.window.showErrorMessage(message.message)
          break
        case 'getLastSystemInstruction':
          const last_system_instruction =
            this._context.globalState.get<string>('lastSystemInstruction') || ''
          webview_view.webview.postMessage({
            command: 'initialSystemInstruction',
            instruction: last_system_instruction
          })
          break
        case 'saveSystemInstruction':
          this._context.globalState.update(
            'lastSystemInstruction',
            message.instruction
          )
          break
        case 'getPromptPrefixes':
          const prompt_prefixes = vscode.workspace
            .getConfiguration()
            .get<string[]>('geminiCoder.promptPrefixes', [])
          webview_view.webview.postMessage({
            command: 'promptPrefixes',
            prefixes: prompt_prefixes
          })
          break
        case 'getLastPromptPrefix':
          const last_prompt_prefix =
            this._context.globalState.get<string>('lastPromptPrefix') || ''
          webview_view.webview.postMessage({
            command: 'initialPromptPrefix',
            prefix: last_prompt_prefix
          })
          break
        case 'savePromptPrefix':
          this._context.globalState.update('lastPromptPrefix', message.prefix)
          break
        case 'getPromptSuffixes':
          const prompt_suffixes = vscode.workspace
            .getConfiguration()
            .get<string[]>('geminiCoder.promptSuffixes', [])
          webview_view.webview.postMessage({
            command: 'promptSuffixes',
            suffixes: prompt_suffixes
          })
          break
        case 'getLastPromptSuffix':
          const last_prompt_suffix =
            this._context.globalState.get<string>('lastPromptSuffix') || ''
          webview_view.webview.postMessage({
            command: 'initialPromptSuffix',
            suffix: last_prompt_suffix
          })
          break
        case 'savePromptSuffix':
          this._context.globalState.update('lastPromptSuffix', message.suffix)
          break
        case 'updateAiStudioModel':
          await vscode.workspace
            .getConfiguration()
            .update(
              'geminiCoder.aiStudioModel',
              message.model,
              vscode.ConfigurationTarget.Global
            )
          break
        case 'getCurrentAiStudioModel':
          const currentModel = vscode.workspace
            .getConfiguration()
            .get('geminiCoder.aiStudioModel')
          webview_view.webview.postMessage({
            command: 'currentAiStudioModel',
            model: currentModel
          })
          break
        case 'getAdditionalWebChats':
          webview_view.webview.postMessage({
            command: 'additionalWebChats',
            webChats: additional_web_chats
          })
          break
        case 'getLastUsedWebChats':
          webview_view.webview.postMessage({
            command: 'lastUsedWebChats',
            webChats: last_used_web_chats
          })
          break
        case 'updateLastUsedWebChats':
          this._context.globalState.update('lastUsedWebChats', message.webChats)
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
          <div id="root"></div>
        <script src="${script_uri}"></script>
      </body>
      </html>
    `
  }
}
