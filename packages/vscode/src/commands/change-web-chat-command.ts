import * as vscode from 'vscode'

export function changeWebChatCommand(
  web_chat_status_bar_item: vscode.StatusBarItem,
  chat_view_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.changeWebChat',
    async () => {
      const config = vscode.workspace.getConfiguration('geminiCoder')
      const web_chat_options = config.get<string[]>('webChat.options', [
        'AI Studio',
        'DeepSeek'
      ])
      const current_web_chat = config.get<string>('webChat', 'AI Studio')

      const selected_web_chat = await vscode.window.showQuickPick(
        web_chat_options,
        {
          placeHolder: 'Select Web Chat',
          matchOnDetail: true,
          canPickMany: false,
          ignoreFocusOut: true
        }
      )

      if (selected_web_chat && selected_web_chat !== current_web_chat) {
        await config.update(
          'webChat',
          selected_web_chat,
          vscode.ConfigurationTarget.Global
        )
        web_chat_status_bar_item.text = `$(comment-discussion) ${selected_web_chat}`
        vscode.window.showInformationMessage(
          `Web chat changed to: ${selected_web_chat}`
        )

        chat_view_provider.update_web_chat_name(selected_web_chat)
      }
    }
  )
}
