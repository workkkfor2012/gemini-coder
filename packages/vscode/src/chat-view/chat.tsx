import React from 'react'
import ReactDOM from 'react-dom/client'
import ChatInput from './components/ChatInput'
const vscode = acquireVsCodeApi()

function ChatApp() {
  const handle_send_message = (instruction: string) => {
    vscode.postMessage({
      command: 'processChatInstruction',
      instruction
    })
  }

  return <ChatInput onSendMessage={handle_send_message} />
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<ChatApp />)
