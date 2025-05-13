import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_code_completions_history = (
  provider: ViewProvider
): void => {
  const history = provider.context.workspaceState.get<string[]>(
    'code-completions-history',
    []
  )
  provider.send_message<ExtensionMessage>({
    command: 'FIM_CHAT_HISTORY',
    messages: history
  })
}
