import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import ChatInput from './components/ChatInput'
const vscode = acquireVsCodeApi()

function Chat() {
  const [initial_instruction, set_initial_instruction] = useState<string>()
  const [system_instructions, set_system_instructions] = useState<string[]>()
  const [selected_system_instruction, set_selected_system_instruction] =
    useState<string>()
  const [prompt_prefixes, set_prompt_prefixes] = useState<string[]>()
  const [selected_prompt_prefix, set_selected_prompt_prefix] =
    useState<string>()
  const [prompt_suffixes, set_prompt_suffixes] = useState<string[]>()
  const [selected_prompt_suffix, set_selected_prompt_suffix] =
    useState<string>()
  const [selected_ai_studio_model, set_selected_ai_studio_model] =
    useState<string>()
  const [selected_ai_studio_temperature, set_selected_ai_studio_temperature] =
    useState<number>()
  const [last_used_web_chats, set_last_used_web_chats] = useState<string[]>()
  const [is_connected, set_is_connected] = useState<boolean>()

  useEffect(() => {
    vscode.postMessage({ command: 'getlastChatPrompt' })
    vscode.postMessage({ command: 'getSystemInstructions' })
    vscode.postMessage({ command: 'getLastSystemInstruction' })
    vscode.postMessage({ command: 'getPromptPrefixes' })
    vscode.postMessage({ command: 'getLastPromptPrefix' })
    vscode.postMessage({ command: 'getPromptSuffixes' })
    vscode.postMessage({ command: 'getLastPromptSuffix' })
    vscode.postMessage({ command: 'getCurrentAiStudioModel' })
    vscode.postMessage({ command: 'getLastUsedWebChats' })
    vscode.postMessage({ command: 'getCurrentAiStudioTemperature' })
    vscode.postMessage({ command: 'getConnectionStatus' })

    const handle_message = (event: MessageEvent) => {
      const message = event.data
      switch (message.command) {
        case 'initialInstruction':
          set_initial_instruction(message.instruction)
          break
        case 'systemInstructions':
          set_system_instructions(message.instructions)
          break
        case 'initialSystemInstruction':
          set_selected_system_instruction(message.instruction)
          break
        case 'promptPrefixes':
          set_prompt_prefixes(message.prefixes)
          break
        case 'initialPromptPrefix':
          set_selected_prompt_prefix(message.prefix)
          break
        case 'promptSuffixes':
          set_prompt_suffixes(message.suffixes)
          break
        case 'initialPromptSuffix':
          set_selected_prompt_suffix(message.suffix)
          break
        case 'currentAiStudioModel':
          set_selected_ai_studio_model(message.model)
          break
        case 'lastUsedWebChats':
          set_last_used_web_chats(message.webChats)
          break
        case 'currentAiStudioTemperature':
          set_selected_ai_studio_temperature(message.temperature)
          break
        case 'connectionStatus':
          set_is_connected(message.connected)
          break
      }
    }

    window.addEventListener('message', handle_message)

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  const handle_send_message = (params: {
    instruction: string
    clipboard_only?: boolean
  }) => {
    vscode.postMessage({
      command: 'processChatInstruction',
      instruction: params.instruction,
      system_instruction: selected_system_instruction,
      prompt_prefix: selected_prompt_prefix,
      prompt_suffix: selected_prompt_suffix,
      clipboard_only: params.clipboard_only
    })
  }

  const handle_instruction_change = (instruction: string) => {
    vscode.postMessage({
      command: 'saveChatInstruction',
      instruction
    })
  }

  const handle_system_instruction_change = (instruction: string) => {
    set_selected_system_instruction(instruction)
    vscode.postMessage({
      command: 'saveSystemInstruction',
      instruction
    })
  }

  const handle_prompt_prefix_change = (prefix: string) => {
    set_selected_prompt_prefix(prefix)
    vscode.postMessage({
      command: 'savePromptPrefix',
      prefix
    })
  }

  const handle_prompt_suffix_change = (suffix: string) => {
    set_selected_prompt_suffix(suffix)
    vscode.postMessage({
      command: 'savePromptSuffix',
      suffix
    })
  }

  const handle_ai_studio_model_change = (model: string) => {
    set_selected_ai_studio_model(model)
    vscode.postMessage({
      command: 'updateAiStudioModel',
      model
    })
  }

  const handle_ai_studio_temperature_change = (temperature: number) => {
    set_selected_ai_studio_temperature(temperature)
    vscode.postMessage({
      command: 'updateAiStudioTemperature',
      temperature
    })
  }

  const handle_web_chat_change = (web_chats: string[]) => {
    set_last_used_web_chats(web_chats)
    vscode.postMessage({
      command: 'updateLastUsedWebChats',
      webChats: web_chats
    })
  }

  if (
    initial_instruction === undefined ||
    system_instructions === undefined ||
    prompt_prefixes === undefined ||
    prompt_suffixes === undefined ||
    last_used_web_chats === undefined ||
    selected_ai_studio_model === undefined ||
    selected_ai_studio_temperature === undefined
  ) {
    return null
  }

  return (
    <ChatInput
      initial_instruction={initial_instruction}
      system_instructions={system_instructions}
      selected_system_instruction={selected_system_instruction}
      on_system_instruction_change={handle_system_instruction_change}
      on_submit={handle_send_message}
      on_instruction_change={handle_instruction_change}
      prompt_prefixes={prompt_prefixes}
      selected_prompt_prefix={selected_prompt_prefix}
      on_prompt_prefix_change={handle_prompt_prefix_change}
      prompt_suffixes={prompt_suffixes}
      selected_prompt_suffix={selected_prompt_suffix}
      on_prompt_suffix_change={handle_prompt_suffix_change}
      selected_ai_studio_model={selected_ai_studio_model}
      on_ai_studio_model_change={handle_ai_studio_model_change}
      selected_ai_studio_temperature={selected_ai_studio_temperature}
      on_ai_studio_temperature_change={handle_ai_studio_temperature_change}
      last_used_web_chats={last_used_web_chats}
      on_web_chat_change={handle_web_chat_change}
      is_connected={is_connected}
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<Chat />)