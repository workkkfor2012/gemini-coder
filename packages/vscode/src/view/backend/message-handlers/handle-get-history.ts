import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_history = (provider: ViewProvider): void => {
  const history = provider.context.workspaceState.get<string[]>('history', [])
  provider.send_message<ExtensionMessage>({
    command: 'CHAT_HISTORY',
    messages: history
  })
}