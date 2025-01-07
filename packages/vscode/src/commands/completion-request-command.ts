import * as vscode from 'vscode'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { Provider } from '../types/provider'
import { make_api_request } from '../helpers/make-api-request'

export function completion_request_command(
  command: string,
  providerType: 'primary' | 'secondary',
  file_tree_provider: any,
  status_bar_item: vscode.StatusBarItem
) {
  return vscode.commands.registerCommand(command, async () => {
    const config = vscode.workspace.getConfiguration()
    const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
    const provider_name = config.get<string>(`geminiCoder.${providerType}Model`)
    const autocomplete_instruction = config.get<string>(
      'geminiCoder.autocompleteInstruction'
    )
    const gemini_api_key = config.get<string>('geminiCoder.apiKey')
    const gemini_temperature = config.get<number>('geminiCoder.temperature')

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

    if (
      !provider_name ||
      !all_providers.some((p) => p.name === provider_name)
    ) {
      vscode.window.showErrorMessage(
        `${providerType} provider is not set or invalid. Please set it in the settings.`
      )
      return
    }

    const provider = all_providers.find((p) => p.name === provider_name)!
    const bearer_tokens = provider.bearerToken
    const model = provider.model
    const temperature = provider.temperature
    const system_instructions = provider.systemInstructions
    const instruction = provider.instruction || autocomplete_instruction
    const verbose = config.get<boolean>('geminiCoder.verbose')
    const attach_open_files = config.get<boolean>('geminiCoder.attachOpenFiles')

    if (!bearer_tokens) {
      vscode.window.showErrorMessage(
        'Bearer token is missing. Please add it in the settings.'
      )
      return
    }

    const tokens_array =
      bearer_tokens?.split(',').map((token: string) => token.trim()) || []
    provider.bearerToken =
      tokens_array[Math.floor(Math.random() * tokens_array.length)]

    const editor = vscode.window.activeTextEditor
    if (editor) {
      let cancel_token_source = axios.CancelToken.source()

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'Waiting for code completion response...'
        },
        async (progress) => {
          progress.report({ increment: 0 })

          const document = editor.document
          const document_path = document.uri.fsPath
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
              .flatMap((group) => group.tabs)
              .map((tab) =>
                tab.input instanceof vscode.TabInputText ? tab.input.uri : null
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

          const content = `${payload.before}<fill missing code>${payload.after}`

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

          const estimated_token_count = Math.floor(content.length / 4)

          if (verbose) {
            console.log('[Gemini Coder] Prompt:', content)
          }

          const cursor_listener = vscode.workspace.onDidChangeTextDocument(
            () => {
              cancel_token_source.cancel(
                'User moved the cursor, cancelling request.'
              )
            }
          )

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
              title: `Waiting for code completion response... (Sent ~${estimated_token_count} tokens)`
            },
            async (progress) => {
              try {
                let completion = await make_api_request(
                  provider,
                  body,
                  cancel_token_source.token
                )

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
                  completion = await make_api_request(
                    fallback_provider,
                    fallback_body,
                    cancel_token_source.token
                  )

                  if (completion === null) return

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
