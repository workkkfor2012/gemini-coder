import * as vscode from 'vscode'

export function create_apply_changes_status_bar_item(
  context: vscode.ExtensionContext
) {
  const apply_changes_status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    98
  )
  apply_changes_status_bar_item.command = 'geminiCoder.applyChanges'
  apply_changes_status_bar_item.text = 'Apply changes'
  apply_changes_status_bar_item.tooltip =
    'Gemini Coder: Integrate AI suggested changes with the current file'
  apply_changes_status_bar_item.show()
  context.subscriptions.push(apply_changes_status_bar_item)
}
