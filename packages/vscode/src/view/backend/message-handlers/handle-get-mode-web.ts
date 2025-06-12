import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_mode_web = (provider: ViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'WEB_MODE',
    mode: provider.web_mode
  })
}
