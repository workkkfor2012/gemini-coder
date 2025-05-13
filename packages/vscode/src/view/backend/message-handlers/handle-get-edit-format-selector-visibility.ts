import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { EditFormatSelectorVisibilityMessage } from '@/view/types/messages'
import { EditFormatSelectorVisibility } from '@/view/types/edit-format-selector-visibility'

export const handle_get_edit_format_selector_visibility = (
  provider: ViewProvider
): void => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const visibility = config.get<EditFormatSelectorVisibility>(
    'editFormatSelectorVisibility'
  )!
  provider.send_message<EditFormatSelectorVisibilityMessage>({
    command: 'EDIT_FORMAT_SELECTOR_VISIBILITY',
    visibility
  })
}
