import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_code_completion_suggestions = (
  provider: ViewProvider
): void => {
  provider.send_message<ExtensionMessage>({
    command: 'CODE_COMPLETION_SUGGESTIONS',
    value: provider.code_completion_suggestions
  })
}
