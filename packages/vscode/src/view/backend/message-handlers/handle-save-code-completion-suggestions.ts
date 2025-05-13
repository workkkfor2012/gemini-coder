import { ViewProvider } from '@/view/backend/view-provider'
import { SaveCodeCompletionSuggestionsMessage } from '@/view/types/messages'

export const handle_save_code_completion_suggestions = async (
  provider: ViewProvider,
  message: SaveCodeCompletionSuggestionsMessage
): Promise<void> => {
  provider.code_completion_suggestions = message.instruction
  await provider.context.workspaceState.update(
    'code-completion-suggestions',
    message.instruction
  )
}
