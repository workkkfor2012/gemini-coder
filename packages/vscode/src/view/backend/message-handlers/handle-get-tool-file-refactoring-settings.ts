import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_api_tool_file_refactoring_settings = (
  provider: ViewProvider
): void => {
  const settings =
    provider.api_tools_settings_manager.get_api_tool_file_refactoring_settings()
  provider.send_message<ExtensionMessage>({
    command: 'API_TOOL_FILE_REFACTORING_SETTINGS',
    settings
  })
}
