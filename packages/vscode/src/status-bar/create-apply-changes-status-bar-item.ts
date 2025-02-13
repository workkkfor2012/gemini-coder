import * as vscode from 'vscode'

interface QuickPickActionItem extends vscode.QuickPickItem {
  command: string
}

const LAST_USED_COMMANDS_KEY = 'geminiCoder.lastUsedApplyChangesCommands'

export function create_apply_changes_status_bar_item(
  context: vscode.ExtensionContext
) {
  const apply_changes_status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    98
  )
  apply_changes_status_bar_item.command = 'geminiCoder.pickApplyChangesAction'
  apply_changes_status_bar_item.text = 'Apply changes'
  apply_changes_status_bar_item.tooltip =
    'Gemini Coder: Integrate AI suggested changes with the current file'
  apply_changes_status_bar_item.show()
  context.subscriptions.push(apply_changes_status_bar_item)

  const default_actions: QuickPickActionItem[] = [
    {
      label: 'With API',
      description: 'Update the file in place',
      command: 'geminiCoder.applyChanges'
    },
    {
      label: 'Open web chat',
      description: 'Continue in the browser',
      command: 'geminiCoder.openWebChatWithApplyChangesPrompt'
    },
    {
      label: 'Clipboard',
      description: 'Just copy the prompt',
      command: 'geminiCoder.copyApplyChangesPrompt'
    }
  ]

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'geminiCoder.pickApplyChangesAction',
      async () => {
        if (!vscode.window.activeTextEditor) {
          vscode.window.showWarningMessage('No active editor found.')
          return
        }

        // Get the last used commands from storage
        const last_used_commands: string[] = context.globalState.get(
          LAST_USED_COMMANDS_KEY,
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
            LAST_USED_COMMANDS_KEY,
            last_used_commands
          )

          // Execute the selected command
          vscode.commands.executeCommand(selected_action.command)
        }
      }
    )
  )
}
