import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import ChatInput from './components/ChatInput'
import { Presets } from './components/Presets'
const vscode = acquireVsCodeApi()

function Chat() {
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

  const handle_send_message = (params: {
    instruction: string
    clipboard_only?: boolean
  }) => {
    vscode.postMessage({
      command: 'sendPrompt',
      instruction: params.instruction,
      clipboard_only: params.clipboard_only
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
    <ChatInput
      initial_instruction={initial_prompt}
      on_submit={handle_send_message}
      on_instruction_change={handle_instruction_change}
      is_connected={is_connected}
      presets={presets}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<Chat />)
