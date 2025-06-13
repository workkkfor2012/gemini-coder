import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'

export const handle_at_sign_quick_pick = async (
  provider: ViewProvider
): Promise<void> => {
  const items = [
    {
      label: '@selection',
      description: 'Inject file path and text selection of the active editor'
    }
  ]

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select symbol to insert'
  })

  if (selected?.label == '@selection') {
    const current_text = provider.instructions

    const is_after_at_sign = current_text
      .slice(0, provider.caret_position)
      .endsWith('@')

    const text_to_insert = is_after_at_sign ? 'selection ' : '@selection '
    provider.add_text_at_cursor_position(text_to_insert)
  }
}
