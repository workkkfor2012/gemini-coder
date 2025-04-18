import { useState, useEffect } from 'react'
import { ExtensionMessage } from '../types/messages'

export const use_open_router_models = (vscode: any) => {
  const [open_router_models, set_open_router_models] = useState<{
    [model: string]: string
  }>()

  const request_open_router_models = () => {
    vscode.postMessage({
      command: 'GET_OPENROUTER_MODELS'
    })
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'OPENROUTER_MODELS') {
        set_open_router_models(message.models)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return {
    open_router_models,
    request_open_router_models
  }
}
