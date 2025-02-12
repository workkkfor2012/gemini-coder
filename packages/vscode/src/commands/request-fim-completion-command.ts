import * as vscode from 'vscode'
import axios, { CancelToken } from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { Provider } from '../types/provider'
import { make_api_request } from '../helpers/make-api-request'
import { autocomplete_instruction } from '../constants/instructions'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'
import { cleanup_api_response } from '../helpers/cleanup-api-response'

async function get_selected_provider(
  context: vscode.ExtensionContext,
  all_providers: Provider[],
  default_model_name: string | undefined
): Promise<Provider | undefined> {
  if (
    !default_model_name ||
    !all_providers.some((p) => p.name == default_model_name)
  ) {
    vscode.window.showErrorMessage('Default model is not set or valid.')
    return undefined
  }

  // Get the last used models from global state
  let last_used_models = context.globalState.get<string[]>('lastUsedModels', [])

  // Filter out the default model from last used models
  last_used_models = last_used_models.filter(
    (model) => model != default_model_name
  )

  // Construct the QuickPick items
  const quick_pick_items: any[] = [
    ...(default_model_name
      ? [
          {
            label: default_model_name,
            description: 'Currently set as default'
          }
        ]
      : []),
    ...last_used_models
      .map((model_name) => {
        const model_provider = all_providers.find((p) => p.name == model_name)
        if (model_provider) {
          return {
            label: model_name
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
        label: p.name
      }))
  ]

  // Show the QuickPick selector
  const selected_item = await vscode.window.showQuickPick(quick_pick_items, {
    placeHolder: 'Select a model for code completion'
  })

  if (!selected_item) {
    return undefined // User cancelled
  }

  // Determine selected model name
  const selected_model_name = selected_item.label

  const selected_provider = all_providers.find(
    (p) => p.name == selected_model_name
  )
  if (!selected_provider) {
    vscode.window.showErrorMessage(`Model "${selected_model_name}" not found.`)
    return undefined
  }

  // Update the last used models in global state
  last_used_models = [
    selected_model_name,
    ...last_used_models.filter((model) => model != selected_model_name)
  ]
  context.globalState.update('lastUsedModels', last_used_models)

  return selected_provider
}

async function handle_rate_limit_fallback(
  all_providers: Provider[],
  default_model_name: string | undefined,
  body: any,
  cancel_token: CancelToken
): Promise<string | null> {
  const available_providers = all_providers.filter(
    (p) => p.name != default_model_name
  )

  const selected_provider_name = await vscode.window.showQuickPick(
    available_providers.map((p) => p.name),
    {
      placeHolder: 'Rate limit reached, retry with another model'
    }
  )

  if (!selected_provider_name) {
    vscode.window.showErrorMessage('No model selected. Request cancelled.')
    return null
  }

  const selected_provider = all_providers.find(
    (p) => p.name == selected_provider_name
  )!
  const fallback_body = {
    ...body,
    model: selected_provider.model,
    temperature: selected_provider.temperature
  }
  return await make_api_request(selected_provider, fallback_body, cancel_token)
}

async function insert_completion_text(
  editor: vscode.TextEditor,
  position: vscode.Position,
  completion: string
): Promise<void> {
  await editor.edit((edit_builder) => {
    edit_builder.insert(position, completion)
  })

  // Adjust cursor position after inserting completion
  setTimeout(() => {
    if (editor) {
      // Check if editor is still valid
      const lines = completion.split('\n')
      const new_line = position.line + lines.length - 1
      const new_char =
        lines.length == 1
          ? position.character + lines[0].length
          : lines[lines.length - 1].length
      const new_position = new vscode.Position(new_line, new_char)
      editor.selection = new vscode.Selection(new_position, new_position)
    }
  }, 50)
}

async function build_completion_payload(
  document: vscode.TextDocument,
  position: vscode.Position,
  file_tree_provider: any,
  attach_open_files?: boolean
): Promise<{ payload: any; content: string }> {
  const documentPath = document.uri.fsPath
  const text_before_cursor = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  )
  const text_after_cursor = document.getText(
    new vscode.Range(position, document.positionAt(document.getText().length))
  )

  let file_paths_to_be_attached: Set<string> = new Set()

  if (file_tree_provider) {
    const selected_files_paths = file_tree_provider.getCheckedFiles()
    for (const file_path of selected_files_paths) {
      if (file_path != documentPath) {
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
      if (open_file_uri.fsPath != documentPath) {
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
  return { payload, content }
}

export function request_fim_completion(params: {
  command: string
  file_tree_provider: any
  context: vscode.ExtensionContext
  use_default_model?: boolean
}) {
  return vscode.commands.registerCommand(params.command, async () => {
    const config = vscode.workspace.getConfiguration()
    const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
    const default_model_name = config.get<string>(`geminiCoder.defaultModel`)
    const gemini_api_key = config.get<string>('geminiCoder.apiKey')
    const gemini_temperature = config.get<number>('geminiCoder.temperature')
    const verbose = config.get<boolean>('geminiCoder.verbose')
    const attach_open_files = config.get<boolean>('geminiCoder.attachOpenFiles')

    const all_providers = [
      ...BUILT_IN_PROVIDERS.map((provider) => ({
        ...provider,
        bearerToken: gemini_api_key || '',
        temperature: gemini_temperature
      })),
      ...user_providers
    ]

    let provider: Provider | undefined
    if (params.use_default_model) {
      provider = all_providers.find((p) => p.name == default_model_name)
    } else {
      provider = await get_selected_provider(
        params.context,
        all_providers,
        default_model_name
      )
    }

    if (!provider) {
      return // Provider selection failed or was cancelled
    }

    if (!provider.bearerToken) {
      vscode.window.showErrorMessage(
        'Bearer token is missing. Please add it in the settings.'
      )
      return
    }

    const model = provider.model
    const temperature = provider.temperature
    const system_instructions = provider.systemInstructions

    const editor = vscode.window.activeTextEditor
    if (editor) {
      let cancel_token_source = axios.CancelToken.source()
      const document = editor.document
      const position = editor.selection.active

      const { payload, content } = await build_completion_payload(
        document,
        position,
        params.file_tree_provider,
        attach_open_files
      )

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

      if (verbose) {
        console.log('[Gemini Coder] Prompt:', content)
      }

      const cursor_listener = vscode.workspace.onDidChangeTextDocument(() => {
        cancel_token_source.cancel('User moved the cursor, cancelling request.')
      })

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'Waiting for FIM completion...'
        },
        async (progress) => {
          progress.report({ increment: 0 })
          try {
            let completion = await make_api_request(
              provider!, // provider is ensured to be defined here
              body,
              cancel_token_source.token
            )

            if (completion === 'rate_limit') {
              completion = await handle_rate_limit_fallback(
                all_providers,
                default_model_name,
                body,
                cancel_token_source.token
              )
            }

            if (completion) {
              // Use the shared cleanup helper before inserting completion text.
              completion = cleanup_api_response(completion)
              await insert_completion_text(editor, position, completion)
            }
          } catch (error: any) {
            console.error('Completion error:', error)
            vscode.window.showErrorMessage(
              `An error occurred during completion: ${error.message}. See console for details.`
            )
          } finally {
            cursor_listener.dispose()
            progress.report({ increment: 100 })
          }
        }
      )
    }
  })
}