import { useEffect, useState } from 'react'
import { ExtensionMessage, WebviewMessage } from '../../types/messages'
import { ToolSettings } from '@shared/types/tool-settings'

export const use_api_tools_configuration = (vscode: any) => {
  const [gemini_api_key, set_gemini_api_key] = useState('')
  const [open_router_api_key, set_open_router_api_key] = useState('')
  const [code_completions_settings, set_code_completions_settings] =
    useState<ToolSettings>()
  const [file_refactoring_settings, set_file_refactoring_settings] =
    useState<ToolSettings>()
  const [commit_message_settings, set_commit_message_settings] =
    useState<ToolSettings>()

  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'GEMINI_API_KEY') {
        set_gemini_api_key(message.api_key || '')
      } else if (message.command == 'OPEN_ROUTER_API_KEY') {
        set_open_router_api_key(message.api_key || '')
      } else if (message.command == 'API_TOOL_CODE_COMPLETIONS_SETTINGS') {
        set_code_completions_settings(message.settings)
      } else if (message.command == 'API_TOOL_FILE_REFACTORING_SETTINGS') {
        set_file_refactoring_settings(message.settings)
      } else if (message.command == 'API_TOOL_COMMIT_MESSAGES_SETTINGS') {
        set_commit_message_settings(message.settings)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages = [
      { command: 'GET_GEMINI_API_KEY' } as WebviewMessage,
      { command: 'GET_OPEN_ROUTER_API_KEY' } as WebviewMessage,
      {
        command: 'GET_API_TOOL_CODE_COMPLETIONS_SETTINGS'
      } as WebviewMessage,
      {
        command: 'GET_API_TOOL_FILE_REFACTORING_SETTINGS'
      } as WebviewMessage,
      {
        command: 'GET_API_TOOL_COMMIT_MESSAGES_SETTINGS'
      } as WebviewMessage
    ]
    initial_messages.forEach((message) => vscode.postMessage(message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_gemini_api_key_change = (api_key: string) => {
    set_gemini_api_key(api_key)
    vscode.postMessage({
      command: 'UPDATE_GEMINI_API_KEY',
      api_key
    })
  }

  const handle_open_router_api_key_change = (api_key: string) => {
    set_open_router_api_key(api_key)
    vscode.postMessage({
      command: 'UPDATE_OPEN_ROUTER_API_KEY',
      api_key
    })
  }

  const handle_code_completions_settings_change = (settings: ToolSettings) => {
    set_code_completions_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_TOOL_CODE_COMPLETIONS_SETTINGS',
      settings
    })
  }

  const handle_file_refactoring_settings_change = (settings: ToolSettings) => {
    set_file_refactoring_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_TOOL_FILE_REFACTORING_SETTINGS',
      settings
    })
  }

  const handle_commit_message_settings_change = (settings: ToolSettings) => {
    set_commit_message_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_TOOL_COMMIT_MESSAGES_SETTINGS',
      settings
    })
  }

  return {
    gemini_api_key,
    open_router_api_key,
    code_completions_settings,
    file_refactoring_settings,
    commit_message_settings,
    handle_gemini_api_key_change,
    handle_open_router_api_key_change,
    handle_code_completions_settings_change,
    handle_file_refactoring_settings_change,
    handle_commit_message_settings_change
  }
}
