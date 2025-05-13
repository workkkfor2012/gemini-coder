import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_GET_API_TOOL_CODE_COMPLETIONS_SETTINGS = (
  provider: ViewProvider
): void => {
  const settings =
    provider.api_tools_settings_manager.GET_API_TOOL_CODE_COMPLETIONS_SETTINGS()
  provider.send_message<ExtensionMessage>({
    command: 'API_TOOL_CODE_COMPLETIONS_SETTINGS',
    settings
  })
}
