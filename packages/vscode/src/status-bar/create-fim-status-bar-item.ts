import * as vscode from 'vscode'

export function create_fim_status_bar_item(context: vscode.ExtensionContext) {
  const fim_status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  fim_status_bar_item.command = 'geminiCoder.requestFimCompletion'
  fim_status_bar_item.text = 'FIM'
  fim_status_bar_item.tooltip =
    'Gemini Coder: Request FIM (Fill In Middle) completion'
  fim_status_bar_item.show()
  context.subscriptions.push(fim_status_bar_item)
}
