import { ViewProvider } from '@/view/backend/view-provider'
import { SaveHistoryMessage } from '@/view/types/messages'

export const handle_save_history = async (
  provider: ViewProvider,
  message: SaveHistoryMessage
): Promise<void> => {
  const key = `history-${message.mode}`
  await provider.context.workspaceState.update(key, message.messages)
}
