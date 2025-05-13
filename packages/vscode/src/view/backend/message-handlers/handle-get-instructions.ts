import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_instructions = (provider: ViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'INSTRUCTIONS',
    value: provider.instructions
  })
}
