import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import ChatInput from './components/ChatInput'
const vscode = acquireVsCodeApi()

function Chat() {
  const [initial_instruction, set_initial_instruction] = useState<string>()

  useEffect(() => {
    vscode.postMessage({ command: 'getLastChatInstruction' })

    const handle_message = (event: MessageEvent) => {
      const message = event.data
      if (message.command === 'initialInstruction') {
        set_initial_instruction(message.instruction)
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
      instruction
    })
  }

  if (initial_instruction === undefined) {
    return null
  }

  return (
    <ChatInput
      on_send_message={handle_send_message}
      initial_instruction={initial_instruction}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<Chat />)
