import * as vscode from 'vscode'

export function create_default_model_status_bar_item(
  context: vscode.ExtensionContext
) {
  const default_model_status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  default_model_status_bar_item.command = 'geminiCoder.changeDefaultModel'
  context.subscriptions.push(default_model_status_bar_item)
  update_status_bar(default_model_status_bar_item)

  return default_model_status_bar_item
}

export async function update_status_bar(status_bar_item: vscode.StatusBarItem) {
  const default_model_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiCoder.defaultModel')

  status_bar_item.text = `${default_model_name || 'Select Model'}`
  status_bar_item.tooltip = 'Gemini Coder: Change default model'
  status_bar_item.show()
}
