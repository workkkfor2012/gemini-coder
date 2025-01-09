import React, { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.scss'

type Props = {
  on_send_message: (message: string) => void
  initial_instruction: string
}

const ChatInput: React.FC<Props> = (props) => {
  const [instruction, setInstruction] = useState(props.initial_instruction)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [])

  const handle_input_change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInstruction(e.target.value)
  }

  const handle_send_message = () => {
    if (instruction.trim()) {
      props.on_send_message(instruction)
    } else {
      window.postMessage({
        command: 'showError',
        message: 'Please enter an instruction.'
      })
    }
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handle_send_message()
    }
  }

  const handle_focus = () => {
    if (textareaRef.current) {
      textareaRef.current.select()
    }
  }

  return (
    <div className={styles['chat-input']}>
      <textarea
        placeholder="Enter instruction..."
        value={instruction}
        onChange={handle_input_change}
        onKeyDown={handle_key_down}
        onFocus={handle_focus}
      />
      <button onClick={handle_send_message}>Continue</button>
    </div>
  )
}

export default ChatInput
