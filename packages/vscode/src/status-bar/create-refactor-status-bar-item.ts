import * as vscode from 'vscode'

export const TEMP_REFACTORING_INSTRUCTION_KEY =
  'temporaryRefactoringInstruction'

export function create_refactor_status_bar_item(
  context: vscode.ExtensionContext
) {
  const refactor_status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99
  )
  refactor_status_bar_item.command = 'geminiCoder.refactor'
  refactor_status_bar_item.text = 'Refactor'
  refactor_status_bar_item.tooltip =
    'Gemini Coder: Refactor the current file with instruction'
  refactor_status_bar_item.show()
  context.subscriptions.push(refactor_status_bar_item)
}
