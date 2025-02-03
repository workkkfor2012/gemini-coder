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
  selected_ai_studio_model?: string
  on_ai_studio_model_change: (model: string) => void
  last_used_web_chats: string[]
  on_web_chat_change: (last_used_web_chats: string[]) => void
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
    const selected_web_chat = e.target.value
    props.on_web_chat_change([
      selected_web_chat,
      ...props.last_used_web_chats.filter(
        (chat_name) => chat_name != selected_web_chat
      )
    ])
  }

  const ai_studio_models = AI_STUDIO_MODELS.map((model) => model.name)

  return (
    <div className={styles.container}>
      <div className={styles['small-selects']}>
        {props.last_used_web_chats.length > 0 && (
          <div>
            <select
              value={props.last_used_web_chats[0]}
              onChange={handle_web_chat_change}
            >
              {props.last_used_web_chats.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
        {props.last_used_web_chats[0] == 'AI Studio' && (
          <>
            <div>
              <select
                value={props.selected_ai_studio_model || ''}
                onChange={handle_ai_studio_model_change}
              >
                {ai_studio_models.map((model, index) => (
                  <option key={index} value={model}>
                    {AI_STUDIO_MODELS.find((m) => m.name == model)?.label ||
                      model}
                  </option>
                ))}
              </select>
            </div>
            <div>
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
      </div>

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
        Continue in {props.last_used_web_chats[0]}
      </button>
      <div className={styles['browser-extension-message']}>
        <span>
          {props.last_used_web_chats[0]} will open in your default browser.
          Paste clipboard manually or automate chat initialization with Gemini
          Coder Connector.
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
