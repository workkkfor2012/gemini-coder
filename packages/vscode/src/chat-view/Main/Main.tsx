import { useState } from 'react'
import styles from './Main.module.scss'
import { Presets as UiPresets } from '@ui/components/Presets'
import { ChatInput as UiChatInput } from '@ui/components/ChatInput'
import { Status as UiStatus } from '@ui/components/Status'
import { Separator as UiSeparator } from '@ui/components/Separator'

type Props = {
  initialize_chats: (params: {
    instruction: string
    preset_names: string[]
  }) => void
  show_preset_picker: (instruction: string) => Promise<string[]>
  copy_to_clipboard: (instruction: string) => void
  on_instruction_change: (instruction: string) => void
  open_settings: () => void
  initial_instruction: string
  is_connected: boolean
  presets: UiPresets.Preset[]
  selected_presets: string[]
  expanded_presets: number[]
  on_selected_presets_change: (selected_names: string[]) => void
  on_expanded_presets_change: (expanded_indices: number[]) => void
}

export const Main: React.FC<Props> = (props) => {
  const [instruction, set_instruction] = useState(props.initial_instruction)

  const handle_input_change = (value: string) => {
    set_instruction(value)
    props.on_instruction_change(value)
  }

  const handle_submit = async () => {
    // If no presets are selected, show the picker
    if (props.selected_presets.length == 0) {
      const selected_names = await props.show_preset_picker(instruction)
      if (selected_names.length > 0) {
        // Update the selected presets through the callback
        props.on_selected_presets_change(selected_names)
        props.initialize_chats({
          instruction,
          preset_names: selected_names
        })
      }
    } else {
      props.initialize_chats({
        instruction,
        preset_names: props.selected_presets
      })
    }
  }

  const handle_copy = () => {
    props.copy_to_clipboard(instruction)
  }

  // Find preset index by name
  const getPresetIndexByName = (name: string): number => {
    const index = props.presets.findIndex((preset) => preset.name === name)
    return index !== -1 ? index : -1
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
        is_connected={props.is_connected}
        submit_disabled_title={
          !props.is_connected
            ? 'WebSocket connection not established. Please install the browser extension.'
            : 'Initialize chats'
        }
      />

      {!props.is_connected && (
        <>
          <UiSeparator size="large" />
          <div className={styles['browser-extension-message']}>
            <span>
              For hands-free chat initialization, consider installing our{' '}
              <a href="https://github.com/robertpiosik/gemini-coder/tree/master/packages/browser">
                open-source
              </a>
              , 100% local browser extension.
            </span>

            <a href="https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp">
              - Install for Chrome
            </a>

            <a href="https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/">
              - Install for Firefox
            </a>
          </div>
        </>
      )}

      <UiSeparator size="large" />

      <UiPresets
        presets={props.presets}
        disabled={!props.is_connected}
        selected_presets={props.selected_presets}
        expanded_presets={props.expanded_presets}
        on_selected_presets_change={props.on_selected_presets_change}
        on_expanded_presets_change={props.on_expanded_presets_change}
        on_edit_presets={props.open_settings}
        on_preset_click={(name) => {
          props.initialize_chats({
            instruction: instruction,
            preset_names: [name]
          })
        }}
      />
    </div>
  )
}
