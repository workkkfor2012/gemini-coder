import { ViewProvider } from '@/view/backend/view-provider'
import { ApiToolFileRefactoringSettingsMessage } from '@/view/types/messages'

export const handle_get_api_tool_file_refactoring_settings = (
  provider: ViewProvider
): void => {
  const settings =
    provider.api_tools_settings_manager.get_api_tool_file_refactoring_settings()
  provider.send_message<ApiToolFileRefactoringSettingsMessage>({
    command: 'API_TOOL_FILE_REFACTORING_SETTINGS',
    settings
  })
}
