import React, { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.scss'

type Props = {
  on_send_message: (message: string) => void
  initial_instruction: string
}

const ChatInput: React.FC<Props> = (props) => {
  const [instruction, setInstruction] = useState(props.initial_instruction)
  const input_ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (input_ref.current) {
      input_ref.current.focus()
      input_ref.current.select()
    }
  }, [])

  const handle_input_change = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handle_key_down = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key == 'Enter') {
      handle_send_message()
      e.preventDefault()
    }
  }

  const handle_focus = () => {
    if (input_ref.current) {
      input_ref.current.select()
    }
  }

  return (
    <div className={styles['chat-input']}>
      <input
        ref={input_ref}
        type="text"
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
