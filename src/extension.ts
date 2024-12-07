import * as vscode from 'vscode'
import axios from 'axios'
import { CancelTokenSource } from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import openai_token_counter from 'openai-gpt-token-counter'
import { initialize_file_tree } from './file-tree/file-tree-initialization'

interface Provider {
  name: string
  endpointUrl: string
  bearerToken: string
  model: string
  temperature?: number
  systemInstructions?: string
  instruction?: string
}

export function activate(context: vscode.ExtensionContext) {
  const file_tree_provider = initialize_file_tree(context)
  let cancel_token_source: CancelTokenSource | undefined
  const status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  status_bar_item.command = 'geminiCoder.changeDefaultProvider'
  context.subscriptions.push(status_bar_item)
  update_status_bar(status_bar_item)

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('geminiCoder.primaryProvider') ||
        e.affectsConfiguration('geminiCoder.secondaryProvider') ||
        e.affectsConfiguration('geminiCoder.apiKey') ||
        e.affectsConfiguration('geminiCoder.temperature')
      ) {
        update_status_bar(status_bar_item)
      }
    })
  )

  const registerCompletionRequestCommand = (command: string, providerType: 'primary' | 'secondary') => {
    return vscode.commands.registerCommand(command, async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
      const provider_name = config.get<string>(`geminiCoder.${providerType}Provider`)
      const global_instruction = config.get<string>('geminiCoder.globalInstruction')
      const gemini_api_key = config.get<string>('geminiCoder.apiKey')
      const gemini_temperature = config.get<number>('geminiCoder.temperature')

      const built_in_providers: Provider[] = [
        {
          name: 'Gemini Flash',
          endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/chat/completions',
          bearerToken: gemini_api_key || '',
          model: 'gemini-1.5-flash',
          temperature: gemini_temperature,
          instruction: ''
        },
        {
          name: 'Gemini Pro',
          endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/chat/completions',
          bearerToken: gemini_api_key || '',
          model: 'gemini-1.5-pro',
          temperature: gemini_temperature,
          instruction: ''
        }
      ]

      const all_providers = [...built_in_providers, ...user_providers]

      if (!provider_name || !all_providers.some(p => p.name === provider_name)) {
        vscode.window.showErrorMessage(`${providerType} provider is not set or invalid. Please set it in the settings.`)
        return
      }

      const provider = all_providers.find(p => p.name === provider_name)!
      const bearer_tokens = provider.bearerToken
      const model = provider.model
      const temperature = provider.temperature
      const system_instructions = provider.systemInstructions
      const instruction = provider.instruction || global_instruction
      const verbose = config.get<boolean>('geminiCoder.verbose')
      const attach_open_files = config.get<boolean>('geminiCoder.attachOpenFiles')

      if (!bearer_tokens) {
        vscode.window.showErrorMessage('Bearer token is missing. Please add it in the settings.')
        return
      }

      const tokens_array = bearer_tokens?.split(',').map((token: string) => token.trim()) || []
      const bearer_token = tokens_array[Math.floor(Math.random() * tokens_array.length)]

      const editor = vscode.window.activeTextEditor
      if (editor) {
        if (cancel_token_source) {
          cancel_token_source.cancel('User moved the cursor, cancelling request.')
        }
        cancel_token_source = axios.CancelToken.source()

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Window,
            title: 'Waiting for code completion response...'
          },
          async (progress) => {
            progress.report({ increment: 0 })
            const document = editor.document
            const document_path = document.uri.fsPath
            const document_text = document.getText()
            const position = editor.selection.active
            const text_before_cursor = document.getText(
              new vscode.Range(new vscode.Position(0, 0), position)
            )
            const text_after_cursor = document.getText(
              new vscode.Range(
                position,
                document.positionAt(document.getText().length)
              )
            )

            /** Context text handling */
            let file_paths_to_be_attached: Set<string> = new Set()
            if (file_tree_provider) {
              const selected_files_paths = file_tree_provider.getCheckedFiles()
              for (const file_path of selected_files_paths) {
                if (file_path != document_path) {
                  file_paths_to_be_attached.add(file_path)
                }
              }
            }
            if (attach_open_files) {
              const open_tabs = vscode.window.tabGroups.all
                .flatMap(group => group.tabs)
                .map(tab =>
                  tab.input instanceof vscode.TabInputText
                    ? tab.input.uri
                    : null
                )
                .filter((uri): uri is vscode.Uri => uri !== null)
              for (const open_file_uri of open_tabs) {
                if (open_file_uri.fsPath != document_path) {
                  file_paths_to_be_attached.add(open_file_uri.fsPath)
                }
              }
            }

            let context_text = ''
            for (const path_to_be_attached of file_paths_to_be_attached) {
              let file_content = fs.readFileSync(path_to_be_attached, 'utf8')
              const relative_path = path.relative(
                vscode.workspace.workspaceFolders![0].uri.fsPath,
                path_to_be_attached
              )
              context_text += `\n<file path="${relative_path}">\n${file_content}\n</file>`
            }

            const payload = {
              before: `<instruction>${instruction}</instruction>\n<files>${context_text}\n<file path="${vscode.workspace.asRelativePath(
                document.uri
              )}">\n${text_before_cursor}`,
              after: `${text_after_cursor}\n</file>\n</files>`
            }

            let content = `${payload.before}<fill missing code>${payload.after}`
            // Remove emtpy lines
            content = content.replace(/\n\s*\n/g, '\n')

            const messages = [
              ...(system_instructions
                ? [{ role: 'system', content: system_instructions }]
                : []),
              {
                role: 'user',
                content
              }
            ]

            const body = {
              messages,
              model,
              temperature
            }

            const estimated_token_count = openai_token_counter.chat(
              messages,
              'gpt-4'
            )

            if (verbose) {
              console.log('[Gemini Coder] Prompt:', content)
            }

            const cursor_listener = vscode.workspace.onDidChangeTextDocument(
              () => {
                if (cancel_token_source) {
                  cancel_token_source.cancel(
                    'User moved the cursor, cancelling request.'
                  )
                }
              }
            )

            async function make_request(
              provider: Provider,
              body: any
            ): Promise<string | null> {
              try {
                const response = await axios.post(provider.endpointUrl, body, {
                  headers: {
                    Authorization: `Bearer ${bearer_token}`,
                    'Content-Type': 'application/json'
                  },
                  cancelToken: cancel_token_source?.token
                })
                console.log(
                  `[Gemini Coder] ${provider.name} RAW completion:`,
                  response.data.choices[0].message.content
                )
                let completion = response.data.choices[0].message.content.trim()
                // Remove duplicated prefix
                const prefix_match = text_before_cursor.match(/\b(\w+)\b$/)
                if (prefix_match) {
                  const prefix = prefix_match[0]
                  if (
                    completion.toLowerCase().startsWith(prefix.toLowerCase())
                  ) {
                    completion = completion.slice(prefix.length)
                  }
                }
                return completion
              } catch (error) {
                if (axios.isCancel(error)) {
                  console.log('Request canceled:', error.message)
                  return null
                } else if (
                  axios.isAxiosError(error) &&
                  error.response?.status === 429
                ) {
                  if (provider.name === 'Gemini Pro') {
                    return 'rate_limit'
                  } else {
                    vscode.window.showErrorMessage(
                      "You've reached the rate limit! Please try again later or switch to a different model."
                    )
                    return null
                  }
                } else {
                  console.error('POST request failed:', error)
                  vscode.window.showErrorMessage(
                    `Failed to send POST request to ${provider.name}. Check console for details.`
                  )
                  return null
                }
              }
            }

            async function insert_completion(completion: string) {
              await editor!.edit((edit_builder) => {
                edit_builder.insert(position, completion)
                setTimeout(() => {
                  const lines = completion.split('\n')
                  const new_line = position.line + lines.length - 1
                  const new_char =
                    lines.length === 1
                      ? position.character + lines[0].length
                      : lines[lines.length - 1].length
                  const new_position = new vscode.Position(new_line, new_char)
                  editor!.selection = new vscode.Selection(
                    new_position,
                    new_position
                  )
                }, 50)
              })
            }

            vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Window,
                title: `Waiting for code completion response... (~${estimated_token_count} tokens)`
              },
              async (progress) => {
                try {
                  let completion = await make_request(provider, body)
                  if (completion == 'rate_limit') {
                    vscode.window.showWarningMessage(
                      'Gemini Pro has hit the rate limit. Retrying with Gemini Flash...'
                    )
                    const fallback_provider = built_in_providers.find(
                      (p) => p.name == 'Gemini Flash'
                    )!
                    const fallback_body = {
                      ...body,
                      model: fallback_provider.model,
                      temperature: fallback_provider.temperature
                    }
                    completion = await make_request(
                      fallback_provider,
                      fallback_body
                    )
                    if (completion === null) return // Already handled error inside make_request
                    if (completion) {
                      await insert_completion(completion)
                    } else {
                      vscode.window.showErrorMessage(
                        'Fallback with Gemini Flash also failed. Please try again later.'
                      )
                    }
                  } else if (completion) {
                    await insert_completion(completion)
                  }
                } finally {
                  cursor_listener.dispose()
                }
                progress.report({ increment: 100 })
              }
            )
          }
        )
      }
    })
  }

  const disposable_send_fim_request = registerCompletionRequestCommand('geminiCoder.sendCompletionRequestPrimary', 'primary')
  const disposable_send_fim_request_secondary = registerCompletionRequestCommand('geminiCoder.sendCompletionRequestSecondary', 'secondary')

  let disposable_change_default_provider = vscode.commands.registerCommand(
    'geminiCoder.changeDefaultProvider',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
      const built_in_providers: Provider[] = [
        {
          name: 'Gemini Flash',
          endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/chat/completions',
          bearerToken: '',
          model: 'gemini-1.5-flash',
          temperature: 0,
          instruction: ''
        },
        {
          name: 'Gemini Pro',
          endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/chat/completions',
          bearerToken: '',
          model: 'gemini-1.5-pro',
          temperature: 0,
          instruction: ''
        }
      ]
      const all_providers = [...built_in_providers, ...user_providers]
      if (!all_providers || all_providers.length == 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        )
        return
      }
      const is_primary = await vscode.window.showQuickPick(
        ['Primary', 'Secondary'],
        { placeHolder: 'Select provider type' }
      )
      if (is_primary) {
        const selected_provider = await vscode.window.showQuickPick(
          all_providers.map((p) => p.name),
          { placeHolder: 'Select default provider for Gemini Coder' }
        )
        if (selected_provider) {
          await config.update(
            `geminiCoder.${is_primary.toLowerCase()}Provider`,
            selected_provider,
            vscode.ConfigurationTarget.Global
          )
          vscode.window.showInformationMessage(
            `Default ${is_primary.toLowerCase()} provider changed to: ${selected_provider}`
          )
          update_status_bar(status_bar_item)
        }
      }
    }
  )

  context.subscriptions.push(disposable_send_fim_request)
  context.subscriptions.push(disposable_send_fim_request_secondary)
  context.subscriptions.push(disposable_change_default_provider)
}

export function deactivate() {}

async function update_status_bar(status_bar_item: vscode.StatusBarItem) {
  const primary_provider_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiCoder.primaryProvider')
  const secondary_provider_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiCoder.secondaryProvider')
  status_bar_item.text = `${
    primary_provider_name || 'Select Primary Provider'
  } (${secondary_provider_name || 'Select Secondary Provider'})`
  status_bar_item.show()
}