import { ViewProvider } from '@/view/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_tool_code_completions_settings = (
  provider: ViewProvider
): void => {
  const settings =
    provider.api_tools_settings_manager.GET_TOOL_CODE_COMPLETIONS_SETTINGS()
  provider.send_message<ExtensionMessage>({
    command: 'CODE_COMPLETIONS_SETTINGS',
    settings
  })
}
