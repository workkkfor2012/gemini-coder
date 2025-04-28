import * as vscode from 'vscode'

export const replace_selection_placeholder = (instruction: string): string => {
  if (!instruction.includes('@selection')) {
    return instruction
  }

  const active_editor = vscode.window.activeTextEditor
  if (!active_editor || active_editor.selection.isEmpty) {
    // If no selection, just return the original instruction
    vscode.window.showInformationMessage(
      'No text selected for @selection placeholder.'
    )
    return instruction.replace(/@selection/g, '')
  }

  const selected_text = active_editor.document.getText(active_editor.selection)

  // Check if the selected text is a single line
  const is_single_line = !selected_text.includes('\n')

  if (is_single_line) {
    // For single-line text, wrap with single backticks
    return instruction.replace(/@selection/g, `\`${selected_text}\``)
  } else {
    // For multi-line text, wrap with triple backticks as before
    return instruction.replace(
      /@selection/g,
      `\n\`\`\`\n${selected_text}\n\`\`\`\n`
    )
  }
}
