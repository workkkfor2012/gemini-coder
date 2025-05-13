import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_show_open_router_model_picker = async (
  provider: ViewProvider,
  models: Array<{ id: string; name: string; description: string }>
): Promise<void> => {
  const model_items = models.map((model) => ({
    label: model.name,
    description: model.id,
    detail: model.description
  }))

  const selected_model = await vscode.window.showQuickPick(model_items, {
    placeHolder: 'Select an OpenRouter model'
  })

  if (selected_model) {
    provider.send_message<ExtensionMessage>({
      command: 'OPEN_ROUTER_MODEL_SELECTED',
      model_id: selected_model.description
    })
  } else {
    provider.send_message<ExtensionMessage>({
      command: 'OPEN_ROUTER_MODEL_SELECTED',
      model_id: undefined
    })
  }
}
