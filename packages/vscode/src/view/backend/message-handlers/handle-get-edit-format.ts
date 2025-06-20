import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_edit_format = (provider: ViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'EDIT_FORMAT',
    chat_edit_format: provider.chat_edit_format,
    api_edit_format: provider.api_edit_format
  })
}
