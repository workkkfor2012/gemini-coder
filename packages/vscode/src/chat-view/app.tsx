import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Main } from './Main'
import { Presets } from './Main/Presets'
const vscode = acquireVsCodeApi()

function App() {
  const [initial_prompt, set_initial_prompt] = useState<string>()
  const [is_connected, set_is_connected] = useState<boolean>()
  const [presets, set_presets] = useState<Presets.Preset[]>()

  useEffect(() => {
    vscode.postMessage({ command: 'getLastPrompt' })
    vscode.postMessage({ command: 'getConnectionStatus' })
    vscode.postMessage({ command: 'getWebChatPresets' })

    const handle_message = (event: MessageEvent) => {
      const message = event.data
      switch (message.command) {
        case 'initialPrompt':
          set_initial_prompt(message.instruction)
          break
        case 'connectionStatus':
          set_is_connected(message.connected)
          break
        case 'webChatPresets':
          set_presets(message.presets)
          break
      }
    }

    window.addEventListener('message', handle_message)

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  const handle_initialize_chats = (params: {
    instruction: string
    presets_idx: number[]
  }) => {
    vscode.postMessage({
      command: 'sendPrompt',
      instruction: params.instruction,
      presets_idx: params.presets_idx
    })
  }

  const handle_copy_to_clipboard = (instruction: string) => {
    vscode.postMessage({
      command: 'copyPrompt',
      instruction
    })
  }

  const handle_instruction_change = (instruction: string) => {
    vscode.postMessage({
      command: 'saveChatInstruction',
      instruction
    })
  }

  if (
    initial_prompt === undefined ||
    is_connected === undefined ||
    presets === undefined
  ) {
    return null
  }

  return (
    <Main
      initial_instruction={initial_prompt}
      initialize_chats={handle_initialize_chats}
      copy_to_clipboard={handle_copy_to_clipboard}
      on_instruction_change={handle_instruction_change}
      is_connected={is_connected}
      presets={presets}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
