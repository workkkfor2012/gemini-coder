import React, { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.scss'
import { AI_STUDIO_MODELS } from '../../constants/ai-studio-models'

type Props = {
  on_submit: (instruction: string) => void
  on_instruction_change: (instruction: string) => void
  initial_instruction: string
  system_instructions: string[]
  selected_system_instruction?: string
  on_system_instruction_change: (instruction: string) => void
  prompt_prefixes: string[]
  selected_prompt_prefix?: string
  on_prompt_prefix_change: (prefix: string) => void
  prompt_suffixes: string[]
  selected_prompt_suffix?: string
  on_prompt_suffix_change: (suffix: string) => void
  ai_studio_models: string[]
  selected_ai_studio_model?: string
  on_ai_studio_model_change: (model: string) => void
  additional_web_chats: any[]
  last_used_web_chats: string[]
  selected_web_chat?: string
  on_web_chat_change: (web_chat: string) => void
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

  useEffect(() => {
    // Set initial selected web chat based on last used
    if (props.last_used_web_chats.length > 0 && !props.selected_web_chat) {
      props.on_web_chat_change(props.last_used_web_chats[0])
    } else if (!props.selected_web_chat) {
      props.on_web_chat_change('AI Studio')
    }
  }, [props.last_used_web_chats, props.selected_web_chat])

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

  const handle_prompt_prefix_change = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    props.on_prompt_prefix_change(e.target.value)
  }

  const handle_prompt_suffix_change = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    props.on_prompt_suffix_change(e.target.value)
  }

  const handle_ai_studio_model_change = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    props.on_ai_studio_model_change(e.target.value)
  }

  const handle_web_chat_change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    props.on_web_chat_change(e.target.value)
  }

  // Construct web chat options
  const web_chat_options = [
    { label: 'AI Studio', value: 'AI Studio' },
    ...props.additional_web_chats.map((chat) => ({
      label: chat.name,
      value: chat.name
    }))
  ]

  // Sort web chat options by last used
  const sorted_web_chat_options = [
    ...props.last_used_web_chats
      .map((chat_name) =>
        web_chat_options.find((option) => option.value == chat_name)
      )
      .filter((option) => option !== undefined),
    ...web_chat_options.filter(
      (option) => !props.last_used_web_chats.includes(option.value)
    )
  ] as { label: string; value: string }[]

  return (
    <div className={styles.container}>
      {props.additional_web_chats.length > 0 && (
        <div className={styles['small-select']}>
          <select
            value={props.selected_web_chat || ''}
            onChange={handle_web_chat_change}
          >
            {sorted_web_chat_options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {props.selected_web_chat == 'AI Studio' && (
        <>
          <div className={styles['small-select']}>
            <select
              value={props.selected_ai_studio_model || ''}
              onChange={handle_ai_studio_model_change}
              disabled={!props.ai_studio_models.length}
            >
              {props.ai_studio_models.map((model, index) => (
                <option key={index} value={model}>
                  {AI_STUDIO_MODELS.find((m) => m.name == model)?.label ||
                    model}
                </option>
              ))}
            </select>
          </div>
          <div className={styles['small-select']}>
            <select
              value={props.selected_system_instruction || ''}
              onChange={handle_system_instruction_change}
              disabled={!props.system_instructions.length}
            >
              <option value="">
                {!props.system_instructions.length
                  ? 'Add system instructions in settings'
                  : 'Select system instructions'}
              </option>
              {props.system_instructions.map((instruction, index) => (
                <option key={index} value={instruction}>
                  {instruction}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <div className={styles['prefix-suffix']}>
        <select
          value={props.selected_prompt_prefix || ''}
          onChange={handle_prompt_prefix_change}
          disabled={!props.prompt_prefixes.length}
        >
          <option value="">
            {!props.prompt_prefixes.length
              ? 'Add prompt prefixes in settings'
              : 'Select prompt prefix'}
          </option>
          {props.prompt_prefixes.map((prefix, index) => (
            <option key={index} value={prefix}>
              {prefix}
            </option>
          ))}
        </select>
      </div>
      <div className={styles['chat-input']}>
        <textarea
          ref={textarea_ref}
          placeholder="Enter a prompt"
          value={instruction}
          onChange={handle_input_change}
          onKeyDown={handle_key_down}
          onFocus={handle_focus}
          autoFocus
        />
      </div>
      <div className={styles['prefix-suffix']}>
        <select
          value={props.selected_prompt_suffix || ''}
          onChange={handle_prompt_suffix_change}
          disabled={!props.prompt_suffixes.length}
        >
          <option value="">
            {!props.prompt_suffixes.length
              ? 'Add prompt suffixes in settings'
              : 'Select prompt suffix'}
          </option>
          {props.prompt_suffixes.map((suffix, index) => (
            <option key={index} value={suffix}>
              {suffix}
            </option>
          ))}
        </select>
      </div>
      <button className={styles.continue} onClick={handle_submit}>
        Continue
      </button>
      <div className={styles['browser-extension-message']}>
        <span>
          AI Studio will open in your default browser. Paste clipboard manually
          or automate chat initialization with Gemini Coder Connector.
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
