import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_history = (provider: ViewProvider): void => {
  const ask_history = provider.context.workspaceState.get<string[]>(
    'history-ask',
    []
  )
  const edit_history = provider.context.workspaceState.get<string[]>(
    'history-edit',
    []
  )
  const no_context_history = provider.context.workspaceState.get<string[]>(
    'history-no-context',
    []
  )
  const code_completions_history = provider.context.workspaceState.get<
    string[]
  >('history-code-completions', [])

  provider.send_message<ExtensionMessage>({
    command: 'CHAT_HISTORY',
    ask: ask_history,
    edit: edit_history,
    no_context: no_context_history,
    code_completions: code_completions_history
  })
}
