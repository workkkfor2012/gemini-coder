import * as vscode from 'vscode'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { Provider } from '../types/provider'
import { make_api_request } from '../helpers/make-api-request'
import { autocomplete_instruction } from '../constants/instructions'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'

export function request_fim_completion(
  command: string,
  file_tree_provider: any,
  context: vscode.ExtensionContext
) {
  return vscode.commands.registerCommand(command, async () => {
    const config = vscode.workspace.getConfiguration()
    const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
    const default_model_name = config.get<string>(`geminiCoder.defaultModel`)
    const gemini_api_key = config.get<string>('geminiCoder.apiKey')
    const gemini_temperature = config.get<number>('geminiCoder.temperature')

    const all_providers = [
      ...BUILT_IN_PROVIDERS.map((provider) => ({
        ...provider,
        bearerToken: gemini_api_key || '',
        temperature: gemini_temperature
      })),
      ...user_providers
    ]

    if (
      !default_model_name ||
      !all_providers.some((p) => p.name == default_model_name)
    ) {
      vscode.window.showErrorMessage('Default model is not set or valid.')
      return
    }

    let provider = all_providers.find((p) => p.name == default_model_name)!

    // Get the last used models from global state
    let last_used_models = context.globalState.get<string[]>(
      'lastUsedModels',
      []
    )

    // Filter out the default model from last used models (it will be added at the beginning)
    last_used_models = last_used_models.filter(
      (model) => model != default_model_name
    )

    // Construct the QuickPick items, prioritizing the default model and last used models
    const quick_pick_items: any[] = [
      {
        label: default_model_name,
        description: 'Currently set as default',
      },
      ...last_used_models
        .map((model_name) => {
          const model_provider = all_providers.find((p) => p.name == model_name)
          if (model_provider) {
            return {
              label: model_name,
            }
          }
          return null
        })
        .filter((item) => item !== null),
      ...all_providers
        .filter(
          (p) =>
            p.name != default_model_name && !last_used_models.includes(p.name)
        )
        .map((p) => ({
          label: p.name,
        }))
    ]

    // Show the QuickPick selector
    const selected_item = await vscode.window.showQuickPick(quick_pick_items, {
      placeHolder: 'Select a model for code completion'
    })

    if (!selected_item) {
      return // User cancelled
    }

    // Update the selected provider based on user selection
    const selected_model_name = selected_item.label.startsWith('$(star-full)')
      ? default_model_name
      : selected_item.label

    provider = all_providers.find((p) => p.name == selected_model_name)!

    // Update the last used models in global state
    last_used_models = [
      selected_model_name,
      ...last_used_models.filter((model) => model != selected_model_name)
    ]
    context.globalState.update('lastUsedModels', last_used_models)

    const model = provider.model
    const temperature = provider.temperature
    const system_instructions = provider.systemInstructions
    const verbose = config.get<boolean>('geminiCoder.verbose')
    const attach_open_files = config.get<boolean>('geminiCoder.attachOpenFiles')

    if (!provider.bearerToken) {
      vscode.window.showErrorMessage(
        'Bearer token is missing. Please add it in the settings.'
      )
      return
    }

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
            context_text += `\n<file path="${relative_path}">\n<![CDATA[\n${file_content}\n]]>\n</file>`
          }

          const payload = {
            before: `<files>${context_text}\n<file path="${vscode.workspace.asRelativePath(
              document.uri
            )}">\n${text_before_cursor}`,
            after: `${text_after_cursor}\n</file>\n</files>`
          }

          const content = `${payload.before}<fill missing code>${payload.after}\n${autocomplete_instruction}`

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
                  lines.length == 1
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
                  const available_providers = all_providers.filter(
                    (p) => p.name != default_model_name
                  )

                  const selected_provider_name =
                    await vscode.window.showQuickPick(
                      available_providers.map((p) => p.name),
                      {
                        placeHolder:
                          'Rate limit reached, retry with another model'
                      }
                    )

                  if (!selected_provider_name) {
                    vscode.window.showErrorMessage(
                      'No model selected. Request cancelled.'
                    )
                    return
                  }

                  const selected_provider = all_providers.find(
                    (p) => p.name == selected_provider_name
                  )!
                  const fallback_body = {
                    ...body,
                    model: selected_provider.model,
                    temperature: selected_provider.temperature
                  }
                  completion = await make_api_request(
                    selected_provider,
                    fallback_body,
                    cancel_token_source.token
                  )
                }

                if (completion) {
                  await insert_completion(completion)
                }
              } catch (error) {
                console.error('Completion error:', error)
                vscode.window.showErrorMessage(
                  'An error occurred during completion. See console for details.'
                )
              } finally {
                cursor_listener.dispose()
                progress.report({ increment: 100 })
              }
            }
          )
        }
      )
    }
  })
}
