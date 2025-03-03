import React, { useState, useRef, useEffect } from 'react'
import styles from './Main.module.scss'
import TextareaAutosize from 'react-autosize-textarea'
import { Presets } from './Presets'

type Props = {
  initialize_chats: (params: {
    instruction: string
    preset_indices: number[]
  }) => void
  copy_to_clipboard: (instruction: string) => void
  on_instruction_change: (instruction: string) => void
  initial_instruction: string
  is_connected: boolean
  presets: Presets.Preset[]
  selected_presets: number[]
  on_presets_selection_change: (selected_indices: number[]) => void
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
    if (e.key == 'Enter' && e.shiftKey) {
      e.preventDefault()
      set_instruction(instruction + '\n')
    }
  }

  const handle_focus = () => {
    if (textarea_ref.current) {
      textarea_ref.current.select()
    }
  }

  const handle_continue = () => {
    props.initialize_chats({
      instruction,
      preset_indices: props.selected_presets
    })
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
            className={styles.buttons__continue}
            onClick={handle_continue}
            disabled={!props.is_connected || !props.selected_presets.length}
            title={
              !props.is_connected
                ? 'WebSocket connection not established. Please install the browser extension.'
                : !props.selected_presets.length
                ? 'Please select at least one preset to continue'
                : 'Click to initialize chats with selected presets'
            }
          >
            Continue
          </button>
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
          <div className={styles['connection-status']}>
            ✓ Connected
            {!props.selected_presets.length
              ? ', select one or more presets to continue'
              : ''}
          </div>
        </>
      ) : (
        <div className={styles['browser-extension-message']}>
          <span>
            This extension exposes a WebSocket server, you need the Gemini Coder
            Connector to use it for hands-free chat initializations.
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
        selected_presets={props.selected_presets}
        on_selection_change={props.on_presets_selection_change}
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
