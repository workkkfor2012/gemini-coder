import * as vscode from 'vscode'

interface QuickPickActionItem extends vscode.QuickPickItem {
  command: string
}

const LAST_USED_REFACTOR_COMMANDS_KEY = 'geminiCoder.lastUsedRefactorCommands'

export function create_refactor_status_bar_item(
  context: vscode.ExtensionContext
) {
  const refactor_status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99
  )
  refactor_status_bar_item.command = 'geminiCoder.pickRefactorAction'
  refactor_status_bar_item.text = 'Refactor'
  refactor_status_bar_item.tooltip =
    'Gemini Coder: Apply AI-powered refactoring to the current file'
  refactor_status_bar_item.show()
  context.subscriptions.push(refactor_status_bar_item)

  const default_actions: QuickPickActionItem[] = [
    {
      label: 'With API',
      description: 'Update the file in place',
      command: 'geminiCoder.refactorWithInstruction'
    },
    {
      label: 'Open web chat',
      description: 'Continue in the browser',
      command: 'geminiCoder.openWebChatWithRefactoringInstruction'
    },
    {
      label: 'Clipboard',
      description: 'Just copy the prompt',
      command: 'geminiCoder.copyRefactoringPrompt'
    }
  ]

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'geminiCoder.pickRefactorAction',
      async () => {
        if (!vscode.window.activeTextEditor) {
          vscode.window.showWarningMessage('No active editor found.')
          return
        }

        // Get the last used commands from storage
        const last_used_commands: string[] = context.globalState.get(
          LAST_USED_REFACTOR_COMMANDS_KEY,
          []
        )

        // Sort actions based on last used commands
        const sorted_actions = [...default_actions].sort((a, b) => {
          const a_index = last_used_commands.indexOf(a.command)
          const b_index = last_used_commands.indexOf(b.command)

          // If both commands are not in history, maintain original order
          if (a_index == -1 && b_index == -1) {
            return 0
          }
          // If only one command is in history, it should come first
          if (a_index == -1) return 1
          if (b_index == -1) return -1
          // Sort by most recently used (lower index means more recent)
          return a_index - b_index
        })

        const selected_action = await vscode.window.showQuickPick(
          sorted_actions
        )

        if (selected_action) {
          // Update the usage history
          const command_index = last_used_commands.indexOf(
            selected_action.command
          )
          if (command_index != -1) {
            last_used_commands.splice(command_index, 1)
          }
          last_used_commands.unshift(selected_action.command)

          // Keep only the last 10 commands in history
          if (last_used_commands.length > 10) {
            last_used_commands.pop()
          }

          // Save the updated history
          await context.globalState.update(
            LAST_USED_REFACTOR_COMMANDS_KEY,
            last_used_commands
          )

          // Execute the selected command
          vscode.commands.executeCommand(selected_action.command)
        }
      }
    )
  )
}
