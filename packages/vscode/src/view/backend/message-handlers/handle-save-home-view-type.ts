import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage, SaveHomeViewTypeMessage } from '@/view/types/messages'

export const handle_save_home_view_type = async (
  provider: ViewProvider,
  message: SaveHomeViewTypeMessage
): Promise<void> => {
  provider.home_view_type = message.view_type
  provider.send_message<ExtensionMessage>({
    command: 'HOME_VIEW_TYPE',
    view_type: message.view_type
  })
}
