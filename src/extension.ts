import * as vscode from 'vscode'
import axios from 'axios'
import { CancelTokenSource } from 'axios'
import * as fs from 'fs'
import openai_token_counter from 'openai-gpt-token-counter'

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
  let cancel_token_source: CancelTokenSource | undefined

  const status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  status_bar_item.command = 'extension.changeDefaultProvider'
  context.subscriptions.push(status_bar_item)
  update_status_bar(status_bar_item)

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('geminiFim.defaultProvider') ||
        e.affectsConfiguration('geminiFim.apiKey') ||
        e.affectsConfiguration('geminiFim.temperature')
      ) {
        update_status_bar(status_bar_item)
      }
    })
  )

  let disposable_send_fim_request = vscode.commands.registerCommand(
    'extension.sendFimRequest',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers = config.get<Provider[]>('geminiFim.providers') || []
      const default_provider_name = config.get<string>(
        'geminiFim.defaultProvider'
      )
      const global_instruction = config.get<string>(
        'geminiFim.globalInstruction'
      )
      const gemini_api_key = config.get<string>('geminiFim.apiKey')
      const gemini_temperature = config.get<number>('geminiFim.temperature')

      const built_in_providers: Provider[] = [
        {
          name: 'Gemini Flash',
          endpointUrl:
            'https://generativelanguage.googleapis.com/v1beta/chat/completions',
          bearerToken: gemini_api_key || '',
          model: 'gemini-1.5-flash',
          temperature: gemini_temperature,
          instruction: ''
        },
        {
          name: 'Gemini Pro',
          endpointUrl:
            'https://generativelanguage.googleapis.com/v1beta/chat/completions',
          bearerToken: gemini_api_key || '',
          model: 'gemini-1.5-pro',
          temperature: gemini_temperature,
          instruction: ''
        }
      ]

      const all_providers = [...built_in_providers, ...user_providers]

      let selected_provider: string | undefined
      if (
        default_provider_name &&
        all_providers.some((p) => p.name === default_provider_name)
      ) {
        selected_provider = default_provider_name
      } else {
        selected_provider = await vscode.window.showQuickPick(
          all_providers.map((p) => p.name),
          { placeHolder: 'Select a provider' }
        )

        if (selected_provider && !default_provider_name) {
          await config.update(
            'geminiFim.defaultProvider',
            selected_provider,
            vscode.ConfigurationTarget.Global
          )
        }
      }

      if (!selected_provider) {
        return
      }

      const provider = all_providers.find((p) => p.name === selected_provider)!

      const endpoint_url = provider.endpointUrl
      const bearer_tokens = provider.bearerToken
      const model = provider.model
      const temperature = provider.temperature
      const system_instructions = provider.systemInstructions
      const instruction = provider.instruction || global_instruction
      const verbose = config.get<boolean>('geminiFim.verbose')
      const attach_open_files = config.get<boolean>('geminiFim.attachOpenFiles')

      if (!bearer_tokens) {
        vscode.window.showErrorMessage(
          'Bearer token is missing. Please add it in the settings.'
        )
        return
      }

      const tokens_array =
        bearer_tokens?.split(',').map((token: string) => token.trim()) || []
      const bearer_token =
        tokens_array[Math.floor(Math.random() * tokens_array.length)]

      const editor = vscode.window.activeTextEditor
      if (editor) {
        if (cancel_token_source) {
          cancel_token_source.cancel(
            'User moved the cursor, cancelling request.'
          )
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

            let open_files_content = ''
            if (attach_open_files) {
              const open_tabs = vscode.window.tabGroups.all
                .flatMap((group) => group.tabs)
                .map((tab) =>
                  tab.input instanceof vscode.TabInputText
                    ? tab.input.uri
                    : null
                )
                .filter((uri): uri is vscode.Uri => uri !== null)

              for (const file of open_tabs) {
                try {
                  const relative_path = vscode.workspace.asRelativePath(file)
                  let file_content = fs.readFileSync(file.fsPath, 'utf8')

                  // Remove BOM if present
                  if (file_content.charCodeAt(0) === 0xfeff) {
                    file_content = file_content.slice(1)
                  }

                  const language_id = await get_language_id(file)

                  open_files_content += `\n<file path="${relative_path}" language="${language_id}">\n${file_content}\n</file>`
                } catch {
                  // Skip files that cannot be read
                }
              }
            }

            const payload = {
              before: `<instruction>${instruction}</instruction>\n<files>${open_files_content}\n<file path="${vscode.workspace.asRelativePath(
                document.uri
              )}" language="${document.languageId}">\n${text_before_cursor}`,
              after: `${text_after_cursor}\n</file></files>`
            }

            const content = `${payload.before}${
              !document_text.includes('<FIM>') ? '<FIM>' : ''
            }${!document_text.includes('</FIM>') ? '</FIM>' : ''}${
              payload.after
            }`

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
              console.log('[Gemini FIM] Prompt:', content)
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

            vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Window,
                title: `Waiting for code completion response... (~${estimated_token_count} tokens)`
              },
              async (progress) => {
                try {
                  const response = await axios.post(endpoint_url, body, {
                    headers: {
                      Authorization: `Bearer ${bearer_token}`,
                      'Content-Type': 'application/json'
                    },
                    cancelToken: cancel_token_source?.token
                  })

                  console.log(
                    '[Gemini FIM] Raw completion:',
                    response.data.choices[0].message.content
                  )

                  let completion = response.data.choices[0].message.content
                  completion = completion
                    .replace(/```[a-zA-Z]*\n([\s\S]*?)```/, '$1')
                    .replace(/`([\s\S]*?)`/, '$1')
                    .trim()

                  // Check for redundant character at the cursor position
                  const char_after_cursor = document.getText(
                    new vscode.Range(position, position.translate(0, 1))
                  )

                  if (completion.endsWith(char_after_cursor)) {
                    completion = completion.slice(0, -1)
                  }

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

                  await editor.edit((edit_builder) => {
                    if (
                      document_text.includes('<FIM>') &&
                      document_text.includes('</FIM>')
                    ) {
                      const fim_start = document_text.indexOf('<FIM>')
                      const fim_end =
                        document_text.indexOf('</FIM>') + '</FIM>'.length
                      const fim_range = new vscode.Range(
                        document.positionAt(fim_start),
                        document.positionAt(fim_end)
                      )
                      edit_builder.replace(fim_range, completion)
                      setTimeout(() => {
                        const new_position = document.positionAt(
                          fim_start + completion.length
                        )
                        editor.selection = new vscode.Selection(
                          new_position,
                          new_position
                        )
                      }, 50)
                    } else {
                      edit_builder.insert(position, completion)
                      setTimeout(() => {
                        const lines = completion.split('\n')
                        const new_line = position.line + lines.length - 1
                        const new_char =
                          lines.length === 1
                            ? position.character + lines[0].length
                            : lines[lines.length - 1].length

                        const new_position = new vscode.Position(
                          new_line,
                          new_char
                        )
                        editor.selection = new vscode.Selection(
                          new_position,
                          new_position
                        )
                      }, 50)
                    }
                  })
                } catch (error) {
                  if (axios.isCancel(error)) {
                    console.log('Request canceled:', error.message)
                  } else if (
                    axios.isAxiosError(error) &&
                    error.response?.status === 429
                  ) {
                    if (provider.name === 'Gemini Pro') {
                      // Retry with Gemini Flash
                      vscode.window.showWarningMessage(
                        'Gemini Pro has hit the rate limit. Retrying with Gemini Flash...'
                      )

                      const fallback_provider = built_in_providers.find(
                        (p) => p.name === 'Gemini Flash'
                      )

                      if (fallback_provider) {
                        // Update provider details to use Gemini Flash
                        const fallback_body = {
                          ...body,
                          model: fallback_provider.model,
                          temperature: fallback_provider.temperature
                        }

                        try {
                          const retry_response = await axios.post(
                            fallback_provider.endpointUrl,
                            fallback_body,
                            {
                              headers: {
                                Authorization: `Bearer ${bearer_token}`,
                                'Content-Type': 'application/json'
                              },
                              cancelToken: cancel_token_source?.token
                            }
                          )

                          let fallback_completion =
                            retry_response.data.choices[0].message.content
                          fallback_completion = fallback_completion
                            .replace(/```[a-zA-Z]*\n([\s\S]*?)```/, '$1')
                            .replace(/`([\s\S]*?)`/, '$1')
                            .trim()

                          console.log(
                            '[Gemini FIM] Fallback Completion:',
                            fallback_completion
                          )

                          // Insert the completion into the editor
                          await editor.edit((edit_builder) => {
                            edit_builder.insert(position, fallback_completion)
                            setTimeout(() => {
                              const lines = fallback_completion.split('\n')
                              const new_line = position.line + lines.length - 1
                              const new_char =
                                lines.length === 1
                                  ? position.character + lines[0].length
                                  : lines[lines.length - 1].length

                              const new_position = new vscode.Position(
                                new_line,
                                new_char
                              )
                              editor.selection = new vscode.Selection(
                                new_position,
                                new_position
                              )
                            }, 50)
                          })
                        } catch (fallbackError) {
                          vscode.window.showErrorMessage(
                            'Fallback with Gemini Flash also failed. Please try again later.'
                          )
                          console.error(
                            'Fallback request failed:',
                            fallbackError
                          )
                        }
                      } else {
                        vscode.window.showErrorMessage(
                          'No fallback provider (Gemini Flash) configured. Please check your settings.'
                        )
                      }
                    } else {
                      vscode.window.showErrorMessage(
                        "You've reached the rate limit! Please try again later or switch to a different model."
                      )
                    }
                  } else {
                    console.error('POST request failed:', error)
                    vscode.window.showErrorMessage(
                      'Failed to send POST request. Check console for details.'
                    )
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
    }
  )

  let disposable_insert_fim_tokens = vscode.commands.registerCommand(
    'extension.insertFimTokens',
    () => {
      const editor = vscode.window.activeTextEditor
      if (editor) {
        const position = editor.selection.active
        editor
          .edit((edit_builder) => {
            edit_builder.insert(position, '<FIM></FIM>')
          })
          .then(() => {
            const new_position = position.translate(0, 5)
            editor.selection = new vscode.Selection(new_position, new_position)
          })
      }
    }
  )

  let disposable_change_default_provider = vscode.commands.registerCommand(
    'extension.changeDefaultProvider',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers = config.get<Provider[]>('geminiFim.providers') || []
      const built_in_providers: Provider[] = [
        {
          name: 'Gemini Flash',
          endpointUrl:
            'https://generativelanguage.googleapis.com/v1beta/chat/completions',
          bearerToken: '',
          model: 'gemini-1.5-flash',
          temperature: 0,
          instruction: ''
        },
        {
          name: 'Gemini Pro',
          endpointUrl:
            'https://generativelanguage.googleapis.com/v1beta/chat/completions',
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

      const selected_provider = await vscode.window.showQuickPick(
        all_providers.map((p) => p.name),
        { placeHolder: 'Select default provider for Gemini FIM' }
      )

      if (selected_provider) {
        await config.update(
          'geminiFim.defaultProvider',
          selected_provider,
          vscode.ConfigurationTarget.Global
        )
        vscode.window.showInformationMessage(
          `Default provider changed to: ${selected_provider}`
        )
        update_status_bar(status_bar_item)
      }
    }
  )

  context.subscriptions.push(disposable_send_fim_request)
  context.subscriptions.push(disposable_insert_fim_tokens)
  context.subscriptions.push(disposable_change_default_provider)
}

export function deactivate() {}

async function update_status_bar(status_bar_item: vscode.StatusBarItem) {
  const default_provider_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiFim.defaultProvider')
  status_bar_item.text = `${default_provider_name || 'Select FIM provider'}`
  status_bar_item.show()
}

async function get_language_id(uri: vscode.Uri): Promise<string> {
  try {
    const document = await vscode.workspace.openTextDocument(uri)
    return document.languageId
  } catch (error) {
    console.error(`Error detecting language for ${uri.fsPath}:`, error)
    return 'plaintext'
  }
}
