import React, { useState, useCallback } from 'react'
import styles from './ChatInput.module.scss'

interface ChatInputProps {
  onSendMessage: (message: string) => void
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [instruction, setInstruction] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInstruction(e.target.value)
  }

  const handleSendMessage = () => {
    if (instruction.trim()) {
      onSendMessage(instruction)
    } else {
      window.postMessage({
        command: 'showError',
        message: 'Please enter an instruction.'
      })
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSendMessage()
        e.preventDefault()
      }
    },
    [handleSendMessage]
  )

  return (
    <div className={styles['chat-input']}>
      <input
        type="text"
        placeholder="Enter instruction..."
        value={instruction}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleSendMessage}>Continue</button>
    </div>
  )
}

export default ChatInput
