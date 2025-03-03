import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Main } from './Main/Main'
const vscode = acquireVsCodeApi()

function App() {
  const [providers, setProviders] = useState<any[]>([])
  const [defaultFimModel, setDefaultFimModel] = useState<string>('')
  const [defaultRefactoringModel, setDefaultRefactoringModel] = useState<string>('')
  const [defaultApplyChangesModel, setDefaultApplyChangesModel] = useState<string>('')

  useEffect(() => {
    vscode.postMessage({ command: 'getConfiguration' })

    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.command === 'configuration') {
        setProviders(message.providers)
        setDefaultFimModel(message.defaultFimModel)
        setDefaultRefactoringModel(message.defaultRefactoringModel)
        setDefaultApplyChangesModel(message.defaultApplyChangesModel)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleFimModelChange = (model: string) => {
    vscode.postMessage({
      command: 'updateFimModel',
      model
    })
    setDefaultFimModel(model)
  }

  const handleRefactoringModelChange = (model: string) => {
    vscode.postMessage({
      command: 'updateRefactoringModel',
      model
    })
    setDefaultRefactoringModel(model)
  }

  const handleApplyChangesModelChange = (model: string) => {
    vscode.postMessage({
      command: 'updateApplyChangesModel',
      model
    })
    setDefaultApplyChangesModel(model)
  }

  return (
    <Main
      providers={providers}
      defaultFimModel={defaultFimModel}
      defaultRefactoringModel={defaultRefactoringModel}
      defaultApplyChangesModel={defaultApplyChangesModel}
      onFimModelChange={handleFimModelChange}
      onRefactoringModelChange={handleRefactoringModelChange}
      onApplyChangesModelChange={handleApplyChangesModelChange}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)