import { ViewProvider } from '@/view/backend/view-provider'
import { ApiToolCommitMessageSettingsMessage } from '@/view/types/messages'

export const handle_get_api_tool_commit_messages_settings = (
  provider: ViewProvider
): void => {
  const settings =
    provider.api_tools_settings_manager.get_api_tool_commit_messages_settings()
  provider.send_message<ApiToolCommitMessageSettingsMessage>({
    command: 'API_TOOL_COMMIT_MESSAGES_SETTINGS',
    settings
  })
}
