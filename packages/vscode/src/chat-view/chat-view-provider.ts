import * as vscode from 'vscode'
import { WEB_CHATS } from '../constants/web-chats'
import { FilesCollector } from '../helpers/files-collector'

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
          WEB_CHATS.filter((chat) => chat.label != 'AI Studio').some(
            (item) => item.label == web_chat
          )
      )
      WEB_CHATS.filter((chat) => chat.label != 'AI Studio').forEach((chat) => {
        if (!last_used_web_chats.includes(chat.label)) {
          last_used_web_chats.push(chat.label)
        }
      })
      this._context.globalState.update('lastUsedWebChats', last_used_web_chats)

      if (message.command == 'getlastChatPrompt') {
        const last_instruction =
          this._context.globalState.get<string>('lastChatPrompt') || ''
        webview_view.webview.postMessage({
          command: 'initialInstruction',
          instruction: last_instruction
        })
      } else if (message.command == 'saveChatInstruction') {
        this._context.globalState.update('lastChatPrompt', message.instruction)
      } else if (message.command == 'getSystemInstructions') {
        const system_instructions = vscode.workspace
          .getConfiguration()
          .get<string[]>('geminiCoder.systemInstructions', [])
        webview_view.webview.postMessage({
          command: 'systemInstructions',
          instructions: system_instructions
        })
      } else if (message.command == 'processChatInstruction') {
        try {
          // Create files collector instance
          const files_collector = new FilesCollector(this.file_tree_provider)
          let context_text = ''

          // Collect files
          context_text = await files_collector.collect_files()

          // Get selected system instruction and prompt modifiers from webview state
          const system_instruction = message.system_instruction
          const prompt_prefix = message.prompt_prefix
          const prompt_suffix = message.prompt_suffix

          // Apply prompt modifiers
          let instruction = message.instruction
          if (prompt_prefix) {
            instruction = `${prompt_prefix.trim()} ${instruction}`
          }
          if (prompt_suffix) {
            instruction = `${instruction} ${prompt_suffix.trim()}`
          }

          // Construct the final text
          let clipboard_text = `${
            context_text ? `<files>${context_text}</files>\n` : ''
          }${instruction}`

          let selected_chat = last_used_web_chats[0] || 'AI Studio'

          if (!message.clipboard_only && selected_chat == 'AI Studio') {
            const ai_studio_temperature = vscode.workspace
              .getConfiguration()
              .get<number>('geminiCoder.aiStudioTemperature')

            const ai_studio_model = vscode.workspace
              .getConfiguration()
              .get<string>('geminiCoder.aiStudioModel')

            clipboard_text = `<model>${ai_studio_model}</model><temperature>${ai_studio_temperature}</temperature>${clipboard_text}`
            if (system_instruction) {
              clipboard_text = `<system>${system_instruction}</system>${clipboard_text}`
            }
          }

          await vscode.env.clipboard.writeText(clipboard_text)

          if (!message.clipboard_only) {
            const chat_url =
              selected_chat == 'AI Studio'
                ? 'https://aistudio.google.com/app/prompts/new_chat'
                : WEB_CHATS.filter((chat) => chat.label != 'AI Studio').find(
                    (chat) => chat.label == selected_chat
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
          }
        } catch (error: any) {
          console.error('Error processing chat instruction:', error)
          vscode.window.showErrorMessage(
            'Error processing chat instruction: ' + error.message
          )
        }
      } else if (message.command == 'showError') {
        vscode.window.showErrorMessage(message.message)
      } else if (message.command == 'getLastSystemInstruction') {
        const last_system_instruction =
          this._context.globalState.get<string>('lastSystemInstruction') || ''
        webview_view.webview.postMessage({
          command: 'initialSystemInstruction',
          instruction: last_system_instruction
        })
      } else if (message.command == 'saveSystemInstruction') {
        this._context.globalState.update(
          'lastSystemInstruction',
          message.instruction
        )
      } else if (message.command == 'getPromptPrefixes') {
        const prompt_prefixes = vscode.workspace
          .getConfiguration()
          .get<string[]>('geminiCoder.promptPrefixes', [])
        webview_view.webview.postMessage({
          command: 'promptPrefixes',
          prefixes: prompt_prefixes
        })
      } else if (message.command == 'getLastPromptPrefix') {
        const last_prompt_prefix =
          this._context.globalState.get<string>('lastPromptPrefix') || ''
        webview_view.webview.postMessage({
          command: 'initialPromptPrefix',
          prefix: last_prompt_prefix
        })
      } else if (message.command == 'savePromptPrefix') {
        this._context.globalState.update('lastPromptPrefix', message.prefix)
      } else if (message.command == 'getPromptSuffixes') {
        const prompt_suffixes = vscode.workspace
          .getConfiguration()
          .get<string[]>('geminiCoder.promptSuffixes', [])
        webview_view.webview.postMessage({
          command: 'promptSuffixes',
          suffixes: prompt_suffixes
        })
      } else if (message.command == 'getLastPromptSuffix') {
        const last_prompt_suffix =
          this._context.globalState.get<string>('lastPromptSuffix') || ''
        webview_view.webview.postMessage({
          command: 'initialPromptSuffix',
          suffix: last_prompt_suffix
        })
      } else if (message.command == 'savePromptSuffix') {
        this._context.globalState.update('lastPromptSuffix', message.suffix)
      } else if (message.command == 'updateAiStudioModel') {
        await vscode.workspace
          .getConfiguration()
          .update(
            'geminiCoder.aiStudioModel',
            message.model,
            vscode.ConfigurationTarget.Global
          )
      } else if (message.command == 'getCurrentAiStudioModel') {
        const currentModel = vscode.workspace
          .getConfiguration()
          .get('geminiCoder.aiStudioModel')
        webview_view.webview.postMessage({
          command: 'currentAiStudioModel',
          model: currentModel
        })
      } else if (message.command == 'getAdditionalWebChats') {
        webview_view.webview.postMessage({
          command: 'additionalWebChats',
          webChats: WEB_CHATS.filter((chat) => chat.label != 'AI Studio')
        })
      } else if (message.command == 'getLastUsedWebChats') {
        webview_view.webview.postMessage({
          command: 'lastUsedWebChats',
          webChats: last_used_web_chats
        })
      } else if (message.command == 'updateLastUsedWebChats') {
        this._context.globalState.update('lastUsedWebChats', message.webChats)
      } else if (message.command == 'updateAiStudioTemperature') {
        await vscode.workspace
          .getConfiguration()
          .update(
            'geminiCoder.aiStudioTemperature',
            message.temperature,
            vscode.ConfigurationTarget.Global
          )
      } else if (message.command == 'getCurrentAiStudioTemperature') {
        const temperature = vscode.workspace
          .getConfiguration()
          .get<number>('geminiCoder.aiStudioTemperature', 0.5)
        webview_view.webview.postMessage({
          command: 'currentAiStudioTemperature',
          temperature
        })
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