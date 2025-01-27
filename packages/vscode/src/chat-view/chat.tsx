import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import ChatInput from './components/ChatInput'
const vscode = acquireVsCodeApi()

function Chat() {
  const [initial_instruction, set_initial_instruction] = useState<string>()
  const [web_chat_name, set_web_chat_name] = useState<string>()
  const [system_instructions, set_system_instructions] = useState<string[]>()
  const [selected_system_instruction, set_selected_system_instruction] =
    useState<string>()

  useEffect(() => {
    vscode.postMessage({ command: 'getLastChatInstruction' })
    vscode.postMessage({ command: 'getWebChatName' })
    vscode.postMessage({ command: 'getSystemInstructions' })
    vscode.postMessage({ command: 'getLastSystemInstruction' })

    const handle_message = (event: MessageEvent) => {
      const message = event.data
      switch (message.command) {
        case 'initialInstruction':
          set_initial_instruction(message.instruction)
          break
        case 'webChatName':
          set_web_chat_name(message.name)
          break
        case 'systemInstructions':
          set_system_instructions(message.instructions)
          break
        case 'initialSystemInstruction':
          set_selected_system_instruction(message.instruction)
          break
      }
    }

    window.addEventListener('message', handle_message)

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  const handle_send_message = (instruction: string) => {
    vscode.postMessage({
      command: 'processChatInstruction',
      instruction,
      system_instruction: selected_system_instruction // Pass selected instruction
    })
  }

  const handle_instruction_change = (instruction: string) => {
    vscode.postMessage({
      command: 'saveChatInstruction',
      instruction
    })
  }

  const handle_system_instruction_change = (instruction: string) => {
    set_selected_system_instruction(instruction)
    vscode.postMessage({
      command: 'saveSystemInstruction',
      instruction
    })
  }

  if (
    initial_instruction === undefined ||
    web_chat_name === undefined ||
    system_instructions === undefined
  ) {
    return null
  }

  return (
    <ChatInput
      initial_instruction={initial_instruction}
      web_chat_name={web_chat_name}
      system_instructions={system_instructions}
      selected_system_instruction={selected_system_instruction}
      on_system_instruction_change={handle_system_instruction_change}
      on_submit={handle_send_message}
      on_instruction_change={handle_instruction_change}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<Chat />)
