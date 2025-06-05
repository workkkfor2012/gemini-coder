import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'

export const handle_at_sign_quick_pick = async (
  provider: ViewProvider
): Promise<void> => {
  const items = [
    {
      label: '@selection',
      description: 'Current text selection in the active editor'
    }
  ]

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select text to insert'
  })

  if (selected?.label == '@selection') {
    provider.add_text_at_cursor_position('@selection ')
  }
}
