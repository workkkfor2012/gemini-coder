import React, { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.scss'
import TextareaAutosize from 'react-autosize-textarea'
import cn from 'classnames'
import { Presets } from './Presets'

type Props = {
  on_submit: (params: { instruction: string; clipboard_only?: boolean }) => void
  on_instruction_change: (instruction: string) => void
  initial_instruction: string
  is_connected: boolean
  presets: Presets.Preset[]
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
    props.on_submit({ instruction })
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

  return (
    <div className={styles.container}>
      <div className={styles['chat-input']}>
        <TextareaAutosize
          ref={textarea_ref}
          placeholder="Type something"
          value={instruction}
          onChange={handle_input_change}
          onKeyDown={handle_key_down}
          onFocus={handle_focus}
          autoFocus
          onPointerEnterCapture={() => {}}
          onPointerLeaveCapture={() => {}}
        />
      </div>
      <div className={styles.buttons}>
        <button
          className={styles.buttons__continue}
          onClick={handle_submit}
          disabled={!props.is_connected}
        >
          Continue
        </button>
        <button
          className={styles.buttons__copy}
          onClick={() => {
            props.on_submit({
              instruction: instruction,
              clipboard_only: true
            })
          }}
        >
          Copy
        </button>
      </div>

      {props.is_connected ? (
        <div
          className={cn(
            styles['connection-status'],
            props.is_connected
              ? styles['connection-status--connected']
              : styles['connection-status--disconnected']
          )}
        >
          {props.is_connected ? '✓ Connected' : '✗ Disconnected'}
        </div>
      ) : (
        <div className={styles['browser-extension-message']}>
          <span>
            Enable hands-free chat initialization with the Gemini Coder
            Connector. This simple browser extension uses a WebSocket connection
            to listen for your prompts and handles all required web interactions
            automatically.
          </span>

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
      )}

      <Presets presets={props.presets} />

      <div className={styles.footer}>
        <div>
          <a href="https://buymeacoffee.com/robertpiosik">Support author</a>
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
