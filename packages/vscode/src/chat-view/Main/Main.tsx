import React, { useState, useRef, useEffect } from 'react'
import styles from './Main.module.scss'
import TextareaAutosize from 'react-autosize-textarea'
import cn from 'classnames'
import { Presets } from './Presets'

type Props = {
  initialize_chats: (params: {
    instruction: string
    presets_idx: number[]
  }) => void
  copy_to_clipboard: (instruction: string) => void
  on_instruction_change: (instruction: string) => void
  initial_instruction: string
  is_connected: boolean
  presets: Presets.Preset[]
}

export const Main: React.FC<Props> = (props) => {
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

  const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Remove Enter key handling since we no longer have a Continue button
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      set_instruction(instruction + '\n')
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
        <div className={styles.buttons}>
          <button
            className={styles.buttons__copy}
            onClick={() => {
              props.copy_to_clipboard(instruction)
            }}
          >
            Copy to clipboard
          </button>
        </div>
      </div>

      {props.is_connected ? (
        <>
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
        </>
      ) : (
        <div className={styles['browser-extension-message']}>
          <span>
            This extension exposes a WebSocket server, you need the Gemini Coder
            Connector to use it for a hands-free chat initialization.
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

      <Presets
        presets={props.presets}
        on_preset_click={(preset_idx) => {
          props.initialize_chats({
            instruction,
            presets_idx: [preset_idx]
          })
        }}
      />

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
