import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_code_completions_mode = (
  provider: ViewProvider
): void => {
  const has_active_editor = !!vscode.window.activeTextEditor

  if (provider.is_code_completions_mode && !has_active_editor) {
    provider.is_code_completions_mode = false
    provider.send_message<ExtensionMessage>({
      command: 'CODE_COMPLETIONS_MODE',
      enabled: false
    })
  } else {
    provider.send_message<ExtensionMessage>({
      command: 'CODE_COMPLETIONS_MODE',
      enabled: provider.is_code_completions_mode
    })
  }
}
