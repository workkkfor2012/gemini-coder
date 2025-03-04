import { useState } from 'react'
import styles from './Main.module.scss'
import { Presets as UiPresets } from '@ui/components/Presets'
import { ChatInput as UiChatInput } from '@ui/components/ChatInput'
import { Status as UiStatus } from '@ui/components/Status'
import { Separator as UiSeparator } from '@ui/components/Separator'

type Props = {
  initialize_chats: (params: {
    instruction: string
    preset_indices: number[]
  }) => void
  copy_to_clipboard: (instruction: string) => void
  on_instruction_change: (instruction: string) => void
  initial_instruction: string
  is_connected: boolean
  presets: UiPresets.Preset[]
  selected_presets: number[]
  on_selected_presets_change: (selected_indices: number[]) => void
}

export const Main: React.FC<Props> = (props) => {
  const [instruction, set_instruction] = useState(props.initial_instruction)

  const handle_input_change = (value: string) => {
    set_instruction(value)
    props.on_instruction_change(value)
  }

  const handle_submit = () => {
    props.initialize_chats({
      instruction,
      preset_indices: props.selected_presets
    })
  }

  const handle_copy = () => {
    props.copy_to_clipboard(instruction)
  }

  return (
    <div className={styles.container}>
      <UiStatus is_connected={props.is_connected} />

      <UiSeparator size="small" />

      <UiChatInput
        value={instruction}
        on_change={handle_input_change}
        on_submit={handle_submit}
        on_copy={handle_copy}
        is_submit_disabled={
          !props.is_connected || !props.selected_presets.length
        }
        submit_disabled_title={
          !props.is_connected
            ? 'WebSocket connection not established. Please install the browser extension.'
            : !props.selected_presets.length
            ? 'Please select at least one preset to continue'
            : 'Click to initialize chats with selected presets'
        }
      />

      {!props.is_connected && (
        <>
          <UiSeparator size="large" />
          <div className={styles['browser-extension-message']}>
            <span>
              If you haven't already, consider installing the companion browser
              extension and enjoy hands-free chat initialization.
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
        </>
      )}

      <UiSeparator size="large" />

      <UiPresets
        presets={props.presets}
        disabled={!props.is_connected}
        selected_presets={props.selected_presets}
        on_selected_presets_change={props.on_selected_presets_change}
      />
    </div>
  )
}
