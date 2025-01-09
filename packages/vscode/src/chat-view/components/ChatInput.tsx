import React, { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.scss'

type Props = {
  on_send_message: (message: string) => void
  initial_instruction: string
  web_chat_name: string
}

const ChatInput: React.FC<Props> = (props) => {
  const [instruction, setInstruction] = useState(props.initial_instruction)
  const textarea_ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textarea_ref.current) {
      textarea_ref.current.focus()
      textarea_ref.current.select()
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
    if (textarea_ref.current) {
      textarea_ref.current.select()
    }
  }

  const get_button_label = () => {
    switch (props.web_chat_name) {
      case 'AI Studio':
        return 'Continue in AI Studio'
      case 'DeepSeek':
        return 'Continue in DeepSeek'
      default:
        return 'Continue'
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles['chat-input']}>
        <textarea
          ref={textarea_ref}
          placeholder="Enter instruction..."
          value={instruction}
          onChange={handle_input_change}
          onKeyDown={handle_key_down}
          onFocus={handle_focus}
          autoFocus
        />
        <button onClick={handle_send_message}>{get_button_label()}</button>
      </div>
      <div className={styles['browser-extension-message']}>
        <p>
          For a seamless experience, consider installing the Gemini Coder
          Connector browser extension:
        </p>
        <ul>
          <li>
            <a
              href="https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Install for Chrome
            </a>
          </li>
          <li>
            <a
              href="https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Install for Firefox
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default ChatInput
