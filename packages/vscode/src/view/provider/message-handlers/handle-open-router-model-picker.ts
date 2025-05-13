import { ViewProvider } from '@/view/view-provider'
import * as vscode from 'vscode'
import { OpenRouterModelSelectedMessage } from '@/view/types/messages'

export const handle_open_router_model_picker = async (params: {
  provider: ViewProvider
  models: Array<{ id: string; name: string; description: string }>
}): Promise<void> => {
  const model_items = params.models.map((model) => ({
    label: model.name,
    description: model.id,
    detail: model.description
  }))

  const selected_model = await vscode.window.showQuickPick(model_items, {
    placeHolder: 'Select an OpenRouter model'
  })

  if (selected_model) {
    params.provider.send_message<OpenRouterModelSelectedMessage>({
      command: 'OPEN_ROUTER_MODEL_SELECTED',
      model_id: selected_model.description
    })
  } else {
    params.provider.send_message<OpenRouterModelSelectedMessage>({
      command: 'OPEN_ROUTER_MODEL_SELECTED',
      model_id: undefined
    })
  }
}
