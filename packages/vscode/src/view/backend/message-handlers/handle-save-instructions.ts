import { ViewProvider } from '@/view/backend/view-provider'
import { SaveInstructionsMessage } from '@/view/types/messages'

export const handle_save_instructions = async (
  provider: ViewProvider,
  message: SaveInstructionsMessage
): Promise<void> => {
  provider.instructions = message.instruction
  await provider.context.workspaceState.update(
    'instructions',
    message.instruction
  )
}
