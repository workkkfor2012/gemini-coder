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

  let disposable_send_fim_request = vscode.commands.registerCommand(
    'extension.sendFimRequest',
    async () => {
      const providers =
        vscode.workspace
          .getConfiguration()
          .get<Provider[]>('anyModelFim.providers') || []
      const default_provider_name = vscode.workspace
        .getConfiguration()
        .get<string>('anyModelFim.defaultProvider')
      const global_instruction = vscode.workspace
        .getConfiguration()
        .get<string>('anyModelFim.globalInstruction')

      if (!providers || providers.length === 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        )
        return
      }

      let selected_provider: string | undefined

      // Check if default provider exists in the configured providers
      const default_provider_exists =
        default_provider_name &&
        providers.some((p) => p.name === default_provider_name)

      if (default_provider_exists) {
        // Use default provider if it exists
        selected_provider = default_provider_name
      } else {
        // Otherwise, let the user select a provider
        selected_provider = await vscode.window.showQuickPick(
          providers.map((p) => p.name),
          { placeHolder: 'Select a provider' }
        )

        // Set the selected provider as default if:
        // 1. No default was set before OR
        // 2. The existing default provider is no longer in the list
        if (
          selected_provider &&
          (!default_provider_name || !default_provider_exists)
        ) {
          await vscode.workspace
            .getConfiguration()
            .update(
              'anyModelFim.defaultProvider',
              selected_provider,
              vscode.ConfigurationTarget.Global
            )
        }
      }

      if (!selected_provider) {
        return
      }

      const provider = providers.find((p) => p.name === selected_provider)!

      const endpoint_url = provider.endpointUrl
      const bearer_tokens = provider.bearerToken
      const model = provider.model
      const temperature = provider.temperature
      const system_instructions = provider.systemInstructions
      const instruction = provider.instruction || global_instruction
      const verbose = vscode.workspace
        .getConfiguration()
        .get<boolean>('anyModelFim.verbose')
      const attach_open_files = vscode.workspace
        .getConfiguration()
        .get<boolean>('anyModelFim.attachOpenFiles')

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
              console.log('[Any Model FIM] Prompt:', content)
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

                  let completion = response.data.choices[0].message.content
                  completion = completion
                    .replace(/```[a-zA-Z]*\n([\s\S]*?)```/, '$1')
                    .trim()

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

                  console.log('[Any Model FIM] Completion:', completion)

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
                    error.response?.status == 429
                  ) {
                    vscode.window.showErrorMessage(
                      "You've reached the rate limit! Please try again later or switch to a different model."
                    )
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
      const providers =
        vscode.workspace
          .getConfiguration()
          .get<Provider[]>('anyModelFim.providers') || []

      if (!providers || providers.length == 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        )
        return
      }

      const selected_provider = await vscode.window.showQuickPick(
        providers.map((p) => p.name),
        { placeHolder: 'Select a new default provider' }
      )

      if (selected_provider) {
        await vscode.workspace
          .getConfiguration()
          .update(
            'anyModelFim.defaultProvider',
            selected_provider,
            vscode.ConfigurationTarget.Global
          )
        vscode.window.showInformationMessage(
          `Default provider changed to: ${selected_provider}`
        )
      }
    }
  )

  context.subscriptions.push(disposable_send_fim_request)
  context.subscriptions.push(disposable_insert_fim_tokens)
  context.subscriptions.push(disposable_change_default_provider)
}

export function deactivate() {}

async function get_language_id(uri: vscode.Uri): Promise<string> {
  try {
    const document = await vscode.workspace.openTextDocument(uri)
    return document.languageId
  } catch (error) {
    console.error(`Error detecting language for ${uri.fsPath}:`, error)
    return 'plaintext'
  }
}
