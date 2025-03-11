import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Main } from './Main'
import { Presets as UiPresets } from '@ui/components/Presets'
const vscode = acquireVsCodeApi()

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/styles.css'

function App() {
  const [normal_mode_instruction, set_normal_mode_instruction] =
    useState<string>()
  const [fim_mode_instruction, set_fim_mode_instruction] = useState<string>()
  const [is_connected, set_is_connected] = useState<boolean>()
  const [presets, set_presets] = useState<UiPresets.Preset[]>()
  const [selected_presets, set_selected_presets] = useState<string[]>([])
  const [expanded_presets, set_expanded_presets] = useState<number[]>([])
  const [is_fim_mode, set_is_fim_mode] = useState<boolean>(false)

  useEffect(() => {
    vscode.postMessage({ command: 'getLastPrompt' })
    vscode.postMessage({ command: 'getLastFimPrompt' })
    vscode.postMessage({ command: 'getConnectionStatus' })
    vscode.postMessage({ command: 'getPresets' })
    vscode.postMessage({ command: 'getSelectedPresets' })
    vscode.postMessage({ command: 'getExpandedPresets' })
    vscode.postMessage({ command: 'getFimMode' })

    const handle_message = (event: MessageEvent) => {
      const message = event.data
      switch (message.command) {
        case 'initialPrompt':
          set_normal_mode_instruction(message.instruction)
          break
        case 'initialFimPrompt':
          set_fim_mode_instruction(message.instruction)
          break
        case 'connectionStatus':
          set_is_connected(message.connected)
          break
        case 'presets':
          set_presets(message.presets)
          break
        case 'selectedPresets':
          set_selected_presets(message.names)
          break
        case 'selectedPresetsFromPicker':
          set_selected_presets(message.names)
          break
        case 'expandedPresets':
          set_expanded_presets(message.indices)
          break
        case 'fimMode':
          set_is_fim_mode(message.enabled)
          break
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_initialize_chats = (params: {
    instruction: string
    preset_names: string[]
  }) => {
    vscode.postMessage({
      command: 'sendPrompt',
      instruction: params.instruction,
      preset_names: params.preset_names
    })
  }

  const handle_show_preset_picker = (
    instruction: string
  ): Promise<string[]> => {
    return new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        const message = event.data
        if (message.command == 'presetsSelectedFromPicker') {
          window.removeEventListener('message', messageHandler)
          resolve(message.names)
        }
      }
      window.addEventListener('message', messageHandler)

      vscode.postMessage({
        command: 'showPresetPicker',
        instruction
      })
    })
  }

  const handle_copy_to_clipboard = (instruction: string) => {
    vscode.postMessage({
      command: 'copyPrompt',
      instruction
    })
  }

  const handle_instruction_change = (instruction: string) => {
    if (is_fim_mode) {
      vscode.postMessage({
        command: 'saveFimInstruction',
        instruction
      })
      set_fim_mode_instruction(instruction)
    } else {
      vscode.postMessage({
        command: 'saveChatInstruction',
        instruction
      })
      set_normal_mode_instruction(instruction)
    }
  }

  const handle_presets_selection_change = (selected_names: string[]) => {
    vscode.postMessage({
      command: 'saveSelectedPresets',
      names: selected_names
    })
    set_selected_presets(selected_names)
  }

  const handle_expanded_presets_change = (expanded_indices: number[]) => {
    vscode.postMessage({
      command: 'saveExpandedPresets',
      indices: expanded_indices
    })
    set_expanded_presets(expanded_indices)
  }

  const handle_open_settings = () => {
    vscode.postMessage({
      command: 'openSettings'
    })
  }

  const handle_fim_mode_click = () => {
    vscode.postMessage({
      command: 'saveFimMode',
      enabled: !is_fim_mode
    })
    set_is_fim_mode(!is_fim_mode)
  }

  if (
    normal_mode_instruction === undefined ||
    fim_mode_instruction === undefined ||
    is_connected === undefined ||
    presets === undefined
  ) {
    return null
  }

  return (
    <Main
      initial_normal_instruction={normal_mode_instruction}
      initial_fim_instruction={fim_mode_instruction}
      initialize_chats={handle_initialize_chats}
      show_preset_picker={handle_show_preset_picker}
      copy_to_clipboard={handle_copy_to_clipboard}
      on_instruction_change={handle_instruction_change}
      is_connected={is_connected}
      presets={presets}
      selected_presets={selected_presets}
      expanded_presets={expanded_presets}
      on_selected_presets_change={handle_presets_selection_change}
      on_expanded_presets_change={handle_expanded_presets_change}
      open_settings={handle_open_settings}
      is_fim_mode={is_fim_mode}
      on_fim_mode_click={handle_fim_mode_click}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
