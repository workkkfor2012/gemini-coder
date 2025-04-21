import { useState, useEffect } from 'react'
import { ExtensionMessage } from '../types/messages'

export const use_open_router_models = (vscode: any) => {
  const [open_router_models, set_open_router_models] = useState<{
    [model_id: string]: { name: string; description: string }
  }>({})

  const request_open_router_models = () => {
    vscode.postMessage({
      command: 'GET_OPEN_ROUTER_MODELS'
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'OPEN_ROUTER_MODELS') {
        set_open_router_models(message.models)
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const get_newly_picked_open_router_model = (): Promise<
    string | undefined
  > => {
    return new Promise((resolve) => {
      const models = Object.entries(open_router_models).map(([id, model]) => ({
        id,
        name: model.name,
        description: model.description
      }))

      vscode.postMessage({
        command: 'SHOW_OPEN_ROUTER_MODEL_PICKER',
        models
      })

      const handle_model_selected = (event: MessageEvent<ExtensionMessage>) => {
        const message = event.data
        if (message.command == 'OPEN_ROUTER_MODEL_SELECTED') {
          window.removeEventListener('message', handle_model_selected)
          resolve(message.model_id)
        }
      }

      window.addEventListener('message', handle_model_selected)
    })
  }

  return {
    open_router_models,
    request_open_router_models,
    get_newly_picked_open_router_model
  }
}
