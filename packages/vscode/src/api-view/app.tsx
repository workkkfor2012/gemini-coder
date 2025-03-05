import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Main } from './Main/Main'
const vscode = acquireVsCodeApi()

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/styles.css'

function App() {
  const [providers, set_providers] = useState<any[]>([])
  const [default_fim_model, set_default_fim_model] = useState<string>('')
  const [default_refactoring_model, set_default_refactoring_model] =
    useState<string>('')
  const [default_apply_changes_model, set_default_apply_changes_model] =
    useState<string>('')

  useEffect(() => {
    vscode.postMessage({ command: 'getConfiguration' })

    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.command == 'configuration') {
        set_providers(message.providers)
        set_default_fim_model(message.default_fim_model)
        set_default_refactoring_model(message.default_refactoring_model)
        set_default_apply_changes_model(message.default_apply_changes_model)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handle_fim_model_change = (model: string) => {
    vscode.postMessage({
      command: 'updateFimModel',
      model
    })
    set_default_fim_model(model)
  }

  const handle_refactoring_model_change = (model: string) => {
    vscode.postMessage({
      command: 'updateRefactoringModel',
      model
    })
    set_default_refactoring_model(model)
  }

  const handle_apply_changes_model_change = (model: string) => {
    vscode.postMessage({
      command: 'updateApplyChangesModel',
      model
    })
    set_default_apply_changes_model(model)
  }

  return (
    <Main
      providers={providers}
      default_fim_model={default_fim_model}
      default_refactoring_model={default_refactoring_model}
      default_apply_changes_model={default_apply_changes_model}
      on_fim_model_change={handle_fim_model_change}
      on_refactoring_model_change={handle_refactoring_model_change}
      on_apply_changes_model_change={handle_apply_changes_model_change}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
