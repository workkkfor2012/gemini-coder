import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_api_tool_code_completions_settings = (
  provider: ViewProvider
): void => {
  const settings =
    provider.api_tools_settings_manager.get_api_tool_code_completions_settings()
  provider.send_message<ExtensionMessage>({
    command: 'API_TOOL_CODE_COMPLETIONS_SETTINGS',
    settings
  })
}
