import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_selected_code_completion_presets = (
  provider: ViewProvider
): void => {
  const selected_names = provider.context.globalState.get<string[]>(
    'selectedCodeCompletionPresets',
    []
  )
  provider.send_message<ExtensionMessage>({
    command: 'SELECTED_CODE_COMPLETION_PRESETS',
    names: selected_names
  })
}
