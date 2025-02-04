import * as vscode from 'vscode'

export function create_apply_changes_status_bar_item(
  context: vscode.ExtensionContext
) {
  const apply_changes_status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99
  )
  apply_changes_status_bar_item.command = 'geminiCoder.pickApplyChangesAction'
  apply_changes_status_bar_item.text = 'Apply changes'
  apply_changes_status_bar_item.tooltip =
    'Integrate AI suggested changes with the current file'
  apply_changes_status_bar_item.show()
  context.subscriptions.push(apply_changes_status_bar_item)

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'geminiCoder.pickApplyChangesAction',
      async () => {
        if (!vscode.window.activeTextEditor) {
          vscode.window.showWarningMessage('No active editor found.')
          return
        }

        const selected_action = await vscode.window.showQuickPick([
          {
            label: 'Use API',
            description: 'Edit file directly in the editor',
            command: 'geminiCoder.applyChanges'
          },
          {
            label: 'Use web chat',
            description: 'Continue with the prompt in the browser',
            command: 'geminiCoder.openWebChatWithApplyChangesPrompt'
          },
          {
            label: 'To clipboard',
            description: 'Just copy the prompt',
            command: 'geminiCoder.copyApplyChangesPrompt'
          }
        ])

        if (selected_action) {
          vscode.commands.executeCommand(selected_action.command)
        }
      }
    )
  )
}
