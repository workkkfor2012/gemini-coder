import { ViewProvider } from '@/view/view-provider'
import { ApiToolFileRefactoringSettingsMessage } from '@/view/types/messages'

export const handle_GET_API_TOOL_FILE_REFACTORING_SETTINGS = (
  provider: ViewProvider
): void => {
  const settings =
    provider.api_tools_settings_manager.GET_API_TOOL_FILE_REFACTORING_SETTINGS()
  provider.send_message<ApiToolFileRefactoringSettingsMessage>({
    command: 'API_TOOL_FILE_REFACTORING_SETTINGS',
    settings
  })
}
