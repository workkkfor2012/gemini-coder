import React, { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.scss'

type Props = {
  on_submit: (instruction: string) => void
  on_instruction_change: (instruction: string) => void
  initial_instruction: string
  web_chat_name: string
  system_instructions: string[]
  selected_system_instruction?: string
  on_system_instruction_change: (instruction: string) => void
}

const ChatInput: React.FC<Props> = (props) => {
  const [instruction, set_instruction] = useState(props.initial_instruction)
  const textarea_ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textarea_ref.current) {
      textarea_ref.current.focus()
      textarea_ref.current.select()
    }
  }, [])

  const handle_input_change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    set_instruction(e.target.value)
    props.on_instruction_change(e.target.value)
  }

  const handle_submit = () => {
    props.on_submit(instruction)
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key == 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handle_submit()
    }
  }

  const handle_focus = () => {
    if (textarea_ref.current) {
      textarea_ref.current.select()
    }
  }

  const handle_system_instruction_change = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    props.on_system_instruction_change(e.target.value)
  }

  return (
    <div className={styles.container}>
      {props.web_chat_name == 'AI Studio' && (
        <div className={styles['system-instructions']}>
          <span>System instructions</span>
          <select
            value={props.selected_system_instruction}
            onChange={handle_system_instruction_change}
          >
            {props.system_instructions.map((instruction, index) => (
              <option key={index} value={instruction}>
                {instruction}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={styles['chat-input']}>
        <textarea
          ref={textarea_ref}
          placeholder="Type something"
          value={instruction}
          onChange={handle_input_change}
          onKeyDown={handle_key_down}
          onFocus={handle_focus}
          autoFocus
        />
        <button onClick={handle_submit}>Continue</button>
      </div>
      <div className={styles['browser-extension-message']}>
        <p>
          Clicking <i>Continue</i> will open {props.web_chat_name} in your
          browser. Paste clipboard manually or automate chat initialization with Gemini Coder Connector.
        </p>
        <ul>
          <li>
            <a href="https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp">
              Install for Chrome
            </a>
          </li>
          <li>
            <a href="https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/">
              Install for Firefox
            </a>
          </li>
        </ul>
      </div>
      <div className={styles.footer}>
        <div>
          <a href="https://buymeacoffee.com/robertpiosik">
            If you find Gemini Coder useful, a coffee would be a wonderful
            gesture... Thank you.
          </a>
        </div>
        <div>
          <a href="https://github.com/robertpiosik/gemini-coder/discussions">
            Send feedback
          </a>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
