import { ViewProvider } from '@/view/view-provider'
import { OpenRouterModelsMessage } from '@/view/types/messages'
import { Logger } from '@/helpers/logger'
import axios from 'axios'
import { OpenRouterModelsResponse } from '@/types/open-router-models-response'
import * as vscode from 'vscode'

export const handle_get_open_router_models = async (
  provider: ViewProvider
): Promise<void> => {
  try {
    const response = await axios.get<OpenRouterModelsResponse>(
      'https://openrouter.ai/api/v1/models'
    )

    const models: {
      [model_id: string]: {
        name: string
        description: string
      }
    } = {}

    for (const model of response.data.data
      .filter((m) => m.created >= 1725148800) // skip older models created before Sep 2024
      .sort((a, b) => a.id.localeCompare(b.id))) {
      models[model.id] = {
        name: model.name,
        description: model.description
      }
    }

    provider.send_message<OpenRouterModelsMessage>({
      command: 'OPEN_ROUTER_MODELS',
      models
    })
  } catch (error) {
    Logger.error({
      function_name: 'handle_get_open_router_models',
      message: 'Error fetching OpenRouter models',
      data: error
    })
    vscode.window.showErrorMessage('Failed to fetch OpenRouter models.')
    provider.send_message<OpenRouterModelsMessage>({
      command: 'OPEN_ROUTER_MODELS',
      models: {}
    })
  }
}
