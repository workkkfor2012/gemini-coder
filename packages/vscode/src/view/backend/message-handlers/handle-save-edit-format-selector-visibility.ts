import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { SaveEditFormatSelectorVisibilityMessage } from '@/view/types/messages'

export const handle_save_edit_format_selector_visibility = async (
  provider: ViewProvider,
  message: SaveEditFormatSelectorVisibilityMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'editFormatSelectorVisibility',
    message.visibility,
    vscode.ConfigurationTarget.Global
  )
}
