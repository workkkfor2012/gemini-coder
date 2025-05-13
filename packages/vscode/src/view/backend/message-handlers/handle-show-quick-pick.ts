import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { ExecuteCommandMessage } from '@/view/types/messages'

export const handle_show_quick_pick = async (
  provider: ViewProvider,
  items: Array<{ label: string; description: string; command: string }>,
  title: string
): Promise<void> => {
  const quick_pick_items = items.map((item) => ({
    label: item.label,
    description: item.description
  }))

  const selected_item = await vscode.window.showQuickPick(quick_pick_items, {
    placeHolder: title
  })

  if (selected_item) {
    const selectedCommand = items.find(
      (item) => item.label == selected_item.label
    )?.command

    if (selectedCommand) {
      provider.send_message<ExecuteCommandMessage>({
        command: 'EXECUTE_COMMAND',
        command_id: selectedCommand
      })
    }
  }
}
