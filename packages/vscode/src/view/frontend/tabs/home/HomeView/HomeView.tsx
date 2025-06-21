import { useState, useEffect, useRef } from 'react'
import styles from './HomeView.module.scss'
import SimpleBar from 'simplebar-react'
import { Presets as UiPresets } from '@ui/components/editor/Presets'
import { ChatInput as UiChatInput } from '@ui/components/editor/ChatInput'
import { Separator as UiSeparator } from '@ui/components/editor/Separator'
import { HorizontalSelector as UiHorizontalSelector } from '@ui/components/editor/HorizontalSelector'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import { Switch as UiSwitch } from '@ui/components/editor/Switch'
import { HOME_VIEW_TYPES, HomeViewType } from '@/view/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import { Dropdown as UiDropdown } from '@ui/components/editor/Dropdown'
import { QuickAction as UiQuickAction } from '@ui/components/editor/QuickAction'

type Props = {
  is_visible: boolean
  initialize_chats: (params: { prompt: string; preset_names: string[] }) => void
  copy_to_clipboard: (instruction: string) => void
  on_create_preset: () => void
  on_at_sign_click: () => void
  on_quick_action_click: (command: string) => void
  is_connected: boolean
  presets: Preset[]
  selected_presets: string[]
  selected_code_completion_presets: string[]
  has_active_editor: boolean
  has_active_selection: boolean
  chat_history: string[]
  chat_history_fim_mode: string[]
  token_count: number
  selection_text?: string
  web_mode: WebMode
  api_mode: ApiMode
  on_web_mode_change: (mode: WebMode) => void
  on_api_mode_change: (mode: ApiMode) => void
  chat_edit_format: EditFormat
  api_edit_format: EditFormat
  on_chat_edit_format_change: (edit_format: EditFormat) => void
  on_api_edit_format_change: (edit_format: EditFormat) => void
  on_presets_reorder: (reordered_presets: Preset[]) => void
  on_preset_edit: (preset_name: string) => void
  on_preset_duplicate: (preset_name: string) => void
  on_preset_delete: (preset_name: string) => void
  on_set_default_presets: () => void
  normal_instructions: string
  set_normal_instructions: (value: string) => void
  code_completion_suggestions: string
  set_code_completion_suggestions: (value: string) => void
  on_caret_position_change: (caret_position: number) => void
  home_view_type: HomeViewType
  on_home_view_type_change: (value: HomeViewType) => void
  on_edit_context_click: () => void
  on_edit_context_with_quick_pick_click: () => void
  on_code_completion_click: () => void
  on_code_completion_with_quick_pick_click: () => void
}

export const HomeView: React.FC<Props> = (props) => {
  const [estimated_input_tokens, set_estimated_input_tokens] = useState(0)
  const [dropdown_max_width, set_dropdown_max_width] = useState<
    number | undefined
  >(undefined)
  const dropdown_container_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)
  const switch_container_ref = useRef<HTMLDivElement>(null)

  const calculate_dropdown_max_width = () => {
    if (!container_ref.current || !switch_container_ref.current) return

    const container_width = container_ref.current.offsetWidth
    const switch_width = switch_container_ref.current.offsetWidth
    const calculated_width = container_width - switch_width - 34

    set_dropdown_max_width(calculated_width)
  }

  useEffect(() => {
    if (!container_ref.current || !switch_container_ref.current) return

    const resize_observer = new ResizeObserver(() => {
      calculate_dropdown_max_width()
    })

    resize_observer.observe(container_ref.current)
    resize_observer.observe(switch_container_ref.current)

    calculate_dropdown_max_width()

    return () => {
      resize_observer.disconnect()
    }
  }, [])

  const is_in_code_completions_mode =
    (props.home_view_type == HOME_VIEW_TYPES.WEB &&
      props.web_mode == 'code-completions') ||
    (props.home_view_type == HOME_VIEW_TYPES.API &&
      props.api_mode == 'code-completions')

  const current_prompt = is_in_code_completions_mode
    ? props.code_completion_suggestions
    : props.normal_instructions

  useEffect(() => {
    let estimated_tokens = 0
    let text = current_prompt

    if (
      text.includes('@selection') &&
      props.has_active_selection &&
      props.selection_text
    ) {
      text = text.replace(/@selection/g, props.selection_text)
    }

    estimated_tokens = Math.ceil(text.length / 4)
    set_estimated_input_tokens(props.token_count + estimated_tokens)
  }, [
    current_prompt,
    props.home_view_type,
    props.has_active_selection,
    props.selection_text,
    props.token_count
  ])

  const handle_input_change = (value: string) => {
    if (is_in_code_completions_mode) {
      props.set_code_completion_suggestions(value)
    } else {
      props.set_normal_instructions(value)
    }
  }

  const handle_submit = async () => {
    if (props.home_view_type == HOME_VIEW_TYPES.WEB) {
      props.initialize_chats({
        prompt: current_prompt,
        preset_names: !is_in_code_completions_mode
          ? props.selected_presets
          : props.selected_code_completion_presets
      })
    } else {
      if (is_in_code_completions_mode) {
        props.on_code_completion_click()
      } else {
        props.on_edit_context_click()
      }
    }
  }

  const handle_submit_with_control = async () => {
    if (props.home_view_type == HOME_VIEW_TYPES.WEB) {
      props.initialize_chats({
        prompt: current_prompt,
        preset_names: []
      })
    } else {
      if (is_in_code_completions_mode) {
        props.on_code_completion_with_quick_pick_click()
      } else {
        props.on_edit_context_with_quick_pick_click()
      }
    }
  }

  const handle_copy = () => {
    props.copy_to_clipboard(current_prompt)
  }

  const handle_preset_copy = (preset_name: string) => {
    const preset = props.presets.find((p) => p.name == preset_name)

    if (preset) {
      let modified_instruction = current_prompt
      if (preset.prompt_prefix) {
        modified_instruction = `${preset.prompt_prefix} ${modified_instruction}`
      }
      if (preset.prompt_suffix) {
        modified_instruction = `${modified_instruction} ${preset.prompt_suffix}`
      }

      props.copy_to_clipboard(modified_instruction)
    }
  }

  return (
    <div
      ref={container_ref}
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <SimpleBar
        style={{
          height: '100%'
        }}
      >
        <div className={styles.inner}>
          <div className={styles.top}>
            <div ref={switch_container_ref}>
              <UiSwitch
                value={props.home_view_type}
                on_change={props.on_home_view_type_change}
                options={Object.values(HOME_VIEW_TYPES)}
                title="Initialize web chats or update files right away"
              />
            </div>

            <div className={styles.top__dropdown} ref={dropdown_container_ref}>
              {props.home_view_type == HOME_VIEW_TYPES.WEB && (
                <UiDropdown
                  options={[
                    { value: 'ask', label: 'Ask about context' },
                    { value: 'edit', label: 'Edit context' },
                    {
                      value: 'code-completions',
                      label: 'Code at cursor with context'
                    },
                    { value: 'no-context', label: 'No context' }
                  ]}
                  selected_value={props.web_mode}
                  on_change={props.on_web_mode_change}
                  title="Select mode"
                  max_width={dropdown_max_width}
                />
              )}
              {props.home_view_type == HOME_VIEW_TYPES.API && (
                <UiDropdown
                  options={[
                    { value: 'edit', label: 'Edit context' },
                    {
                      value: 'code-completions',
                      label: 'Code at cursor with context'
                    }
                  ]}
                  selected_value={props.api_mode}
                  on_change={props.on_api_mode_change}
                  title="Select mode"
                  max_width={dropdown_max_width}
                />
              )}
            </div>
          </div>

          <UiSeparator height={8} />

          {!props.is_connected &&
            props.home_view_type == HOME_VIEW_TYPES.WEB && (
              <>
                <div className={styles['browser-extension-message']}>
                  <span>
                    Get the Connector browser extension for hands-free chat
                    inititalizations
                  </span>
                  <a href="https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp">
                    Chrome Web Store ↗
                  </a>
                  <a href="https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/">
                    Firefox Add-ons ↗
                  </a>
                </div>

                <UiSeparator height={8} />
              </>
            )}

          <div className={styles['chat-input']}>
            <UiChatInput
              value={current_prompt}
              chat_history={props.chat_history}
              chat_history_fim_mode={props.chat_history_fim_mode}
              on_change={handle_input_change}
              on_submit={handle_submit}
              on_submit_with_control={handle_submit_with_control}
              on_copy={
                props.home_view_type == HOME_VIEW_TYPES.WEB
                  ? handle_copy
                  : undefined
              }
              on_at_sign_click={props.on_at_sign_click}
              is_web_mode={props.home_view_type == HOME_VIEW_TYPES.WEB}
              is_connected={props.is_connected}
              token_count={estimated_input_tokens}
              submit_disabled_title={
                !props.is_connected
                  ? 'WebSocket connection not established. Please install the browser extension.'
                  : 'Type something'
              }
              is_in_code_completions_mode={is_in_code_completions_mode}
              has_active_selection={props.has_active_selection}
              has_active_editor={props.has_active_editor}
              on_caret_position_change={props.on_caret_position_change}
              translations={{
                type_something: 'Type something',
                completion_suggestions: 'Completion suggestions',
                send_request: 'Send request',
                initialize_chat: 'Initialize chat',
                select_preset: 'Select preset',
                select_config: 'Select config',
                code_completions_mode_unavailable_with_text_selection:
                  'Unable to work with text selection',
                code_completions_mode_unavailable_without_active_editor:
                  'This mode requires active editor'
              }}
            />
          </div>

          {((props.home_view_type == HOME_VIEW_TYPES.WEB &&
            props.web_mode == 'edit') ||
            (props.home_view_type == HOME_VIEW_TYPES.API &&
              props.api_mode == 'edit')) && (
            <>
              <UiSeparator height={10} />
              <div className={styles['edit-format']}>
                <span>RESPONSE EDIT FORMAT</span>
                <UiHorizontalSelector
                  options={[
                    {
                      value: 'whole',
                      label: 'Whole',
                      title: 'The model will output complete files'
                    },
                    {
                      value: 'truncated',
                      label: 'Truncated',
                      title: 'The model will skip unchanged fragments'
                    },
                    {
                      value: 'diff',
                      label: 'Diff',
                      title: 'The model will output diffs'
                    }
                  ]}
                  selected_value={
                    props.home_view_type == HOME_VIEW_TYPES.WEB
                      ? props.chat_edit_format
                      : props.api_edit_format
                  }
                  on_select={(value) =>
                    props.home_view_type == HOME_VIEW_TYPES.WEB
                      ? props.on_chat_edit_format_change(value as EditFormat)
                      : props.on_api_edit_format_change(value as EditFormat)
                  }
                />
              </div>
            </>
          )}

          <UiSeparator height={16} />

          <div className={styles['workflow-commands']}>
            <span>WORKFLOW COMMANDS</span>
            <div className={styles['workflow-commands__inner']}>
              {props.home_view_type == HOME_VIEW_TYPES.WEB &&
                (props.web_mode == 'edit' ||
                  props.web_mode == 'code-completions') && (
                  <UiQuickAction
                    title="Apply Chat Response"
                    description="Integrate copied message or code block"
                    on_click={() =>
                      props.on_quick_action_click(
                        'codeWebChat.applyChatResponse'
                      )
                    }
                  />
                )}
              {((props.home_view_type == HOME_VIEW_TYPES.WEB &&
                (props.web_mode == 'edit' ||
                  props.web_mode == 'code-completions')) ||
                (props.home_view_type == HOME_VIEW_TYPES.API &&
                  props.api_mode == 'edit')) && (
                <UiQuickAction
                  title="Revert Last Changes"
                  description="Restore saved state of the codebase"
                  on_click={() =>
                    props.on_quick_action_click('codeWebChat.revert')
                  }
                />
              )}
              <UiQuickAction
                title="Commit Changes"
                description="Generate commit message and commit"
                on_click={() =>
                  props.on_quick_action_click('codeWebChat.commitChanges')
                }
              />
            </div>
          </div>

          {props.home_view_type == HOME_VIEW_TYPES.WEB && (
            <>
              <UiSeparator height={16} />
              <UiPresets
                presets={props.presets.map((preset) => {
                  return {
                    ...preset,
                    has_affixes: !!(
                      preset.prompt_prefix || preset.prompt_suffix
                    )
                  }
                })}
                is_disabled={!props.is_connected}
                selected_presets={props.selected_presets}
                selected_code_completion_presets={
                  props.selected_code_completion_presets
                }
                on_create_preset={props.on_create_preset}
                on_preset_click={(name) => {
                  props.initialize_chats({
                    prompt: current_prompt,
                    preset_names: [name]
                  })
                }}
                on_preset_copy={handle_preset_copy}
                on_preset_edit={props.on_preset_edit}
                is_in_code_completions_mode={is_in_code_completions_mode}
                on_presets_reorder={props.on_presets_reorder}
                on_preset_duplicate={props.on_preset_duplicate}
                on_preset_delete={props.on_preset_delete}
                on_set_default_presets={props.on_set_default_presets}
              />
            </>
          )}
        </div>
      </SimpleBar>
    </div>
  )
}
