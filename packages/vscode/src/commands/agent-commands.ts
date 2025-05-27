import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { Logger } from '../helpers/logger'
import { ApiProvidersManager } from '../services/api-providers-manager'
import { make_api_request } from '../helpers/make-api-request'
import axios from 'axios'
import { PROVIDERS } from '@shared/constants/providers'
import { get_refactor_config } from './refactor-commands'

const perform_agent_task = async (params: {
  context: vscode.ExtensionContext
  file_tree_provider: any
  open_editors_provider?: any
  show_quick_pick?: boolean
}) => {
  const api_providers_manager = new ApiProvidersManager(params.context)

  const editor = vscode.window.activeTextEditor
  let current_file_path = ''
  let selected_text = ''

  if (editor) {
    const document = editor.document
    current_file_path = vscode.workspace.asRelativePath(document.uri)

    const selection = editor.selection
    selected_text = editor.document.getText(selection)
  }

  const files_collector = new FilesCollector(
    params.file_tree_provider,
    params.open_editors_provider
  )

  const collected_files = await files_collector.collect_files({
    active_path: editor?.document?.uri.fsPath
  })

  if (!collected_files) {
    vscode.window.showErrorMessage('Unable to work with empty context.')
    return
  }

  const last_chat_prompt =
    params.context.workspaceState.get<string>('last-chat-prompt') || ''

  const input_box = vscode.window.createInputBox()
  input_box.placeholder = 'Enter instructions'
  input_box.value = last_chat_prompt

  input_box.onDidChangeValue(async (value) => {
    await params.context.workspaceState.update('last-chat-prompt', value)
  })

  const instructions = await new Promise<string | undefined>((resolve) => {
    input_box.onDidAccept(() => {
      const value = input_box.value.trim()
      if (value.length === 0) {
        vscode.window.showErrorMessage('Instruction cannot be empty')
        return
      }
      resolve(value)
      input_box.hide()
    })
    input_box.onDidHide(() => resolve(undefined))
    input_box.show()
  })

  if (!instructions) {
    return
  }

  const config_result = await get_refactor_config(
    api_providers_manager,
    params.show_quick_pick,
    params.context
  )

  if (!config_result) {
    return
  }

  const { provider, config: agent_settings } = config_result

  if (!provider.api_key) {
    vscode.window.showErrorMessage(
      'API key is missing. Please add it in the Settings tab.'
    )
    return
  }

  let endpoint_url = ''
  if (provider.type == 'built-in') {
    const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
    if (!provider_info) {
      vscode.window.showErrorMessage(
        `Built-in provider "${provider.name}" not found. Navigate to the Settings tab, configure API providers and setup the API tool.`
      )
      Logger.warn({
        function_name: 'perform_agent_task',
        message: `Built-in provider "${provider.name}" not found.`
      })
      return
    }
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  let agent_instructions = ''
  if (selected_text) {
    agent_instructions += `\`${current_file_path}\`\n\`\`\`\n${selected_text}\n\`\`\`\n`
  }
  agent_instructions += instructions

  const files = `<files>${collected_files}\n</files>`
  const edit_format_instructions =
    'Whenever proposing a file use the markdown code block syntax. Each code block should be a diff patch. Do not send explanations.'
  const content = `${agent_instructions}\n${edit_format_instructions}\n${files}\n${agent_instructions}\n${edit_format_instructions}`

  const messages = [
    {
      role: 'user',
      content
    }
  ]

  const body = {
    messages,
    model: agent_settings.model,
    temperature: agent_settings.temperature
  }

  Logger.log({
    function_name: 'perform_agent_task',
    message: 'Agent Prompt:',
    data: content
  })

  const cancel_token_source = axios.CancelToken.source()

  try {
    const response = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Waiting for response',
        cancellable: true
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          cancel_token_source.cancel('Cancelled by user.')
        })

        let total_tokens = 0

        return make_api_request(
          endpoint_url,
          provider.api_key,
          body,
          cancel_token_source.token,
          (chunk: string) => {
            total_tokens += Math.ceil(chunk.length / 4)
            progress.report({
              message: `received ${total_tokens} tokens...`
            })
          }
        )
      }
    )

    if (response) {
      vscode.env.clipboard.writeText(response)
      await new Promise((resolve) => setTimeout(resolve, 500))
      await vscode.commands.executeCommand('codeWebChat.applyChatResponse')
    }
  } catch (error) {
    if (axios.isCancel(error)) return
    Logger.error({
      function_name: 'perform_agent_task',
      message: 'Agent task error',
      data: error
    })
    vscode.window.showErrorMessage(
      'An error occurred during agent task. See console for details.'
    )
  }
}

export const agent_commands = (params: {
  context: vscode.ExtensionContext
  workspace_provider: any
  open_editors_provider?: any
}) => {
  return [
    vscode.commands.registerCommand('codeWebChat.agent', async () =>
      perform_agent_task({
        context: params.context,
        file_tree_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        show_quick_pick: false
      })
    ),
    vscode.commands.registerCommand('codeWebChat.agentUsing', async () =>
      perform_agent_task({
        context: params.context,
        file_tree_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        show_quick_pick: true
      })
    )
  ]
}
