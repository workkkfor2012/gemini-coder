import { WebChatsTab } from './tabs/web-chats/WebChatsTab'
import { ApiToolsTab } from './tabs/api-tools/ApiToolsTab'
import { Header } from '@ui/components/editor/Header'
import { useEffect, useState } from 'react'
import { Template } from '@ui/components/editor/Template'
import { EditView } from '@ui/components/editor/EditView'
import { EditPresetForm } from '@ui/components/editor/EditPresetForm'
import { Preset } from '@shared/types/preset'
import {
  ExtensionMessage,
  SaveInstructionsMessage,
  SaveCodeCompletionSuggestionsMessage
} from './types/messages'
import { use_open_router_models } from './hooks/use-open-router-models'
import { ApiSettingsForm } from '@ui/components/editor/ApiSettingsForm'
import { BUILT_IN_PROVIDERS } from '@/constants/built-in-providers'
import { use_api_tools_configuration } from './hooks/use-api-tools-configuration'
import { TextButton } from '@ui/components/editor/TextButton'

const vscode = acquireVsCodeApi()

export const View = () => {
  const [active_tab, set_active_tab] = useState<'chat' | 'api'>('chat')
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [updated_preset, set_updated_preset] = useState<Preset>()
  const [is_configuring_api_tools, set_is_configuring_api_tools] =
    useState(false)
  const [is_in_code_completions_mode, set_is_in_code_completions_mode] =
    useState(false)
  const [instructions, set_instructions] = useState<string | undefined>(
    undefined
  )
  const [code_completion_suggestions, set_code_completion_suggestions] =
    useState<string | undefined>(undefined)

  const open_router_models_hook = use_open_router_models(vscode)
  const api_tools_configuration_hook = use_api_tools_configuration(vscode)

  const save_normal_instructions_debounced = debounce((instruction: string) => {
    vscode.postMessage({
      command: 'SAVE_INSTRUCTIONS',
      instruction
    } as SaveInstructionsMessage)
  }, 500)

  const save_code_completion_suggestions_debounced = debounce(
    (instruction: string) => {
      vscode.postMessage({
        command: 'SAVE_CODE_COMPLETION_SUGGESTIONS',
        instruction
      } as SaveCodeCompletionSuggestionsMessage)
    },
    500
  )

  const handle_instructions_change = (value: string) => {
    set_instructions(value)
    save_normal_instructions_debounced(value)
  }

  const handle_code_completion_suggestions_change = (value: string) => {
    set_code_completion_suggestions(value)
    save_code_completion_suggestions_debounced(value)
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'CODE_COMPLETIONS_MODE') {
        set_is_in_code_completions_mode(message.enabled)
      } else if (message.command == 'PRESET_UPDATED') {
        set_updating_preset(undefined)
        set_updated_preset(undefined)
      } else if (message.command == 'INSTRUCTIONS') {
        set_instructions(message.value)
      } else if (message.command == 'CODE_COMPLETION_SUGGESTIONS') {
        set_code_completion_suggestions(message.value)
      }
    }
    window.addEventListener('message', handle_message)
    vscode.postMessage({ command: 'GET_CODE_COMPLETIONS_MODE' })
    vscode.postMessage({ command: 'GET_INSTRUCTIONS' })
    vscode.postMessage({ command: 'GET_CODE_COMPLETION_SUGGESTIONS' })

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const edit_preset_back_click_handler = () => {
    vscode.postMessage({
      command: 'UPDATE_PRESET',
      updating_preset: updating_preset,
      updated_preset: updated_preset
    })
  }

  const handle_preview_preset = () => {
    const instructions_to_send = is_in_code_completions_mode
      ? code_completion_suggestions
      : instructions

    vscode.postMessage({
      command: 'PREVIEW_PRESET',
      instruction: instructions_to_send,
      preset: updated_preset
    })
  }

  if (
    !api_tools_configuration_hook.code_completions_settings ||
    !api_tools_configuration_hook.file_refactoring_settings ||
    !api_tools_configuration_hook.commit_message_settings ||
    instructions === undefined ||
    code_completion_suggestions === undefined
  ) {
    return null
  }

  const tabs = (
    <>
      <Header
        active_tab={active_tab}
        on_chat_tab_click={() => {
          set_active_tab('chat')
        }}
        on_api_tab_click={() => {
          set_active_tab('api')
        }}
      />
      <WebChatsTab
        vscode={vscode}
        is_visible={active_tab == 'chat'}
        on_preset_edit={(preset) => {
          set_updating_preset(preset)
        }}
        normal_instructions={instructions}
        set_normal_instructions={handle_instructions_change}
        code_completion_suggestions={code_completion_suggestions}
        set_code_completion_suggestions={
          handle_code_completion_suggestions_change
        }
      />
      <ApiToolsTab
        vscode={vscode}
        is_visible={active_tab == 'api'}
        on_configure_api_tools_click={() => set_is_configuring_api_tools(true)}
      />
    </>
  )

  let edit_view: React.ReactNode | undefined = undefined

  if (updating_preset) {
    edit_view = (
      <EditView
        on_back_click={edit_preset_back_click_handler}
        header_slot={
          <TextButton
            on_click={handle_preview_preset}
            disabled={
              is_in_code_completions_mode &&
              !!(updated_preset?.prompt_prefix || updated_preset?.prompt_suffix)
            }
            title={
              is_in_code_completions_mode &&
              !!(updated_preset?.prompt_prefix || updated_preset?.prompt_suffix)
                ? 'Preview is not available for presets with prompt prefix or suffix in code completions mode.'
                : undefined
            }
          >
            Preview
          </TextButton>
        }
      >
        <EditPresetForm
          preset={updating_preset}
          on_update={set_updated_preset}
          request_open_router_models={
            open_router_models_hook.request_open_router_models
          }
          open_router_models={open_router_models_hook.open_router_models}
          get_newly_picked_open_router_model={
            open_router_models_hook.get_newly_picked_open_router_model
          }
        />
      </EditView>
    )
  } else if (is_configuring_api_tools) {
    edit_view = (
      <EditView
        on_back_click={() => {
          set_is_configuring_api_tools(false)
        }}
      >
        <ApiSettingsForm
          gemini_api_key={api_tools_configuration_hook.gemini_api_key}
          open_router_models={open_router_models_hook.open_router_models}
          gemini_api_models={Object.fromEntries(
            BUILT_IN_PROVIDERS.map((provider) => [
              provider.model,
              provider.name
            ])
          )}
          open_router_api_key={api_tools_configuration_hook.open_router_api_key}
          code_completions_settings={
            api_tools_configuration_hook.code_completions_settings
          }
          file_refactoring_settings={
            api_tools_configuration_hook.file_refactoring_settings
          }
          commit_messages_settings={
            api_tools_configuration_hook.commit_message_settings
          }
          on_code_completions_settings_update={
            api_tools_configuration_hook.handle_code_completions_settings_change
          }
          on_file_refactoring_settings_update={
            api_tools_configuration_hook.handle_file_refactoring_settings_change
          }
          on_commit_messages_settings_update={
            api_tools_configuration_hook.handle_commit_message_settings_change
          }
          on_gemini_api_key_change={
            api_tools_configuration_hook.handle_gemini_api_key_change
          }
          on_open_router_api_key_change={
            api_tools_configuration_hook.handle_open_router_api_key_change
          }
          request_open_router_models={
            open_router_models_hook.request_open_router_models
          }
          get_newly_picked_open_router_model={
            open_router_models_hook.get_newly_picked_open_router_model
          }
        />
      </EditView>
    )
  }

  return (
    <>
      <Template edit_view_slot={edit_view} tabs_slot={tabs} />
    </>
  )
}

export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}
