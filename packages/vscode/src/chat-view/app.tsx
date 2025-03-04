import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Main } from './Main'
import { Presets as UiPresets } from '@ui/components/Presets'
const vscode = acquireVsCodeApi()

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/styles.css'

function App() {
  const [initial_prompt, set_initial_prompt] = useState<string>()
  const [is_connected, set_is_connected] = useState<boolean>()
  const [presets, set_presets] = useState<UiPresets.Preset[]>()
  const [selected_presets, set_selected_presets] = useState<number[]>([])

  useEffect(() => {
    vscode.postMessage({ command: 'getLastPrompt' })
    vscode.postMessage({ command: 'getConnectionStatus' })
    vscode.postMessage({ command: 'getWebChatPresets' })
    vscode.postMessage({ command: 'getSelectedPresets' })

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
        case 'selectedPresets':
          set_selected_presets(message.indices)
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
    preset_indices: number[]
  }) => {
    vscode.postMessage({
      command: 'sendPrompt',
      instruction: params.instruction,
      preset_indices: params.preset_indices
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

  const handle_presets_selection_change = (selected_indices: number[]) => {
    vscode.postMessage({
      command: 'saveSelectedPresets',
      indices: selected_indices
    })
    set_selected_presets(selected_indices)
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
      selected_presets={selected_presets}
      on_presets_selection_change={handle_presets_selection_change}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
