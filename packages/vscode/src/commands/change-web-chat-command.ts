import * as vscode from 'vscode'

export function changeWebChatCommand(
  webChatStatusBarItem: vscode.StatusBarItem
) {
  return vscode.commands.registerCommand(
    'geminiCoder.changeWebChat',
    async () => {
      const config = vscode.workspace.getConfiguration('geminiCoder')
      const webChatOptions = config.get<string[]>('webChat.options', [
        'AI Studio',
        'DeepSeek'
      ])
      const currentWebChat = config.get<string>('webChat', 'AI Studio')

      const selectedWebChat = await vscode.window.showQuickPick(
        webChatOptions,
        {
          placeHolder: 'Select Web Chat',
          matchOnDetail: true,
          canPickMany: false,
          ignoreFocusOut: true
        }
      )

      if (selectedWebChat && selectedWebChat !== currentWebChat) {
        await config.update(
          'webChat',
          selectedWebChat,
          vscode.ConfigurationTarget.Global
        )
        webChatStatusBarItem.text = `$(comment-discussion) ${selectedWebChat}`
        vscode.window.showInformationMessage(
          `Web chat changed to: ${selectedWebChat}`
        )
      }
    }
  )
}
