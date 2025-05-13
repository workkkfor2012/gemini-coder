import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_open_router_api_key = (
  provider: ViewProvider
): void => {
  const api_key = provider.api_tools_settings_manager.get_open_router_api_key()
  provider.send_message<ExtensionMessage>({
    command: 'OPEN_ROUTER_API_KEY',
    api_key
  })
}
