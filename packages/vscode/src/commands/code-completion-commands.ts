import * as vscode from 'vscode'
import axios from 'axios'
import { Provider } from '../types/provider'
import { make_api_request } from '../helpers/make-api-request'
import { autocomplete_instruction } from '../constants/instructions'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'
import { cleanup_api_response } from '../helpers/cleanup-api-response'
import { handle_rate_limit_fallback } from '../helpers/handle-rate-limit-fallback'
import { FilesCollector } from '../helpers/files-collector'
import { ModelManager } from '../services/model-manager'

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

  let last_used_models = context.globalState.get<string[]>('lastUsedModels', [])
  last_used_models = last_used_models.filter(
    (model) => model != default_model_name
  )

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

  const selected_item = await vscode.window.showQuickPick(quick_pick_items, {
    placeHolder: 'Select a model for code completion'
  })

  if (!selected_item) {
    return undefined
  }

  const selected_model_name = selected_item.label

  const selected_provider = all_providers.find(
    (p) => p.name == selected_model_name
  )
  if (!selected_provider) {
    vscode.window.showErrorMessage(`Model "${selected_model_name}" not found.`)
    return undefined
  }

  last_used_models = [
    selected_model_name,
    ...last_used_models.filter((model) => model != selected_model_name)
  ]
  context.globalState.update('lastUsedModels', last_used_models)

  return selected_provider
}

async function build_completion_payload(
  document: vscode.TextDocument,
  position: vscode.Position,
  file_tree_provider: any,
  open_editors_provider?: any,
  suggestions?: string
): Promise<string> {
  const document_path = document.uri.fsPath
  const text_before_cursor = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  )
  const text_after_cursor = document.getText(
    new vscode.Range(position, document.positionAt(document.getText().length))
  )

  const files_collector = new FilesCollector(
    file_tree_provider,
    open_editors_provider
  )

  const context_text = await files_collector.collect_files({
    exclude_path: document_path
  })

  const payload = {
    before: `<files>${context_text}<file name="${vscode.workspace.asRelativePath(
      document.uri
    )}"><![CDATA[${text_before_cursor}`,
    after: `${text_after_cursor}]]></file>\n</files>`
  }

  return `${payload.before}<fill missing code>${
    payload.after
  }\n${autocomplete_instruction}${
    suggestions ? ` Follow suggestions: ${suggestions}` : ''
  }`
}

/**
 * Show inline completion using Inline Completions API
 */
async function show_inline_completion(
  editor: vscode.TextEditor,
  position: vscode.Position,
  completionText: string
) {
  const controller = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    {
      provideInlineCompletionItems: () => {
        const item = {
          insertText: completionText,
          range: new vscode.Range(position, position)
        }
        return [item]
      }
    }
  )

  // Trigger the inline completion UI
  await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger')

  // Dispose after a timeout or some event (optional cleanup)
  setTimeout(() => controller.dispose(), 10000)
}

// Core function that contains the shared logic
async function perform_fim_completion(
  file_tree_provider: any,
  open_editors_provider: any,
  context: vscode.ExtensionContext,
  provider: Provider,
  with_suggestions: boolean = false
) {
  let suggestions: string | undefined
  if (with_suggestions) {
    suggestions = await vscode.window.showInputBox({
      placeHolder: 'Enter suggestions',
      prompt: 'E.g. include explanatory comments'
    })

    if (suggestions === undefined) {
      return
    }
  }

  const config = vscode.workspace.getConfiguration()
  const verbose = config.get<boolean>('geminiCoder.verbose')

  if (!provider.apiKey) {
    vscode.window.showErrorMessage(
      'API key is missing. Please add it in the settings.'
    )
    return
  }

  const model = provider.model
  const temperature = provider.temperature
  const system_instructions = provider.systemInstructions

  const editor = vscode.window.activeTextEditor
  if (editor) {
    const cancel_token_source = axios.CancelToken.source()
    const document = editor.document
    const position = editor.selection.active

    const content = await build_completion_payload(
      document,
      position,
      file_tree_provider,
      open_editors_provider,
      suggestions
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
        title: 'Waiting for a completion...'
      },
      async (progress) => {
        progress.report({ increment: 0 })
        try {
          const model_manager = new ModelManager(context)
          const default_model_name = model_manager.get_default_fim_model()

          const config = vscode.workspace.getConfiguration()
          const user_providers =
            config.get<Provider[]>('geminiCoder.providers') || []
          const gemini_api_key = config.get<string>('geminiCoder.apiKey')
          const gemini_temperature = config.get<number>(
            'geminiCoder.temperature'
          )

          const all_providers = [
            ...BUILT_IN_PROVIDERS.map((provider) => ({
              ...provider,
              apiKey: gemini_api_key || '',
              temperature: gemini_temperature
            })),
            ...user_providers
          ]

          let completion = await make_api_request(
            provider,
            body,
            cancel_token_source.token
          )

          if (completion == 'rate_limit') {
            completion = await handle_rate_limit_fallback(
              all_providers,
              default_model_name,
              body,
              cancel_token_source.token
            )
          }

          if (completion) {
            completion = cleanup_api_response({ content: completion })
            await show_inline_completion(editor, position, completion)
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
}

/**
 * Register all FIM completion commands
 */
export function fim_completion_command(
  file_tree_provider: any,
  open_editors_provider: any,
  context: vscode.ExtensionContext
) {
  const model_manager = new ModelManager(context)

  return vscode.commands.registerCommand(
    'geminiCoder.codeCompletion',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers =
        config.get<Provider[]>('geminiCoder.providers') || []
      const gemini_api_key = config.get<string>('geminiCoder.apiKey')
      const gemini_temperature = config.get<number>('geminiCoder.temperature')

      const default_model_name = model_manager.get_default_fim_model()

      const all_providers = [
        ...BUILT_IN_PROVIDERS.map((provider) => ({
          ...provider,
          apiKey: gemini_api_key || '',
          temperature: gemini_temperature
        })),
        ...user_providers
      ]

      const provider = all_providers.find((p) => p.name == default_model_name)

      if (!provider) {
        vscode.window.showErrorMessage('Default model is not set or valid.')
        return
      }

      await perform_fim_completion(
        file_tree_provider,
        open_editors_provider,
        context,
        provider,
        false
      )
    }
  )
}

/**
 * Register FIM completion with model selection
 */
export function fim_completion_with_command(
  file_tree_provider: any,
  open_editors_provider: any,
  context: vscode.ExtensionContext
) {
  const model_manager = new ModelManager(context)

  return vscode.commands.registerCommand(
    'geminiCoder.codeCompletionWith',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers =
        config.get<Provider[]>('geminiCoder.providers') || []
      const gemini_api_key = config.get<string>('geminiCoder.apiKey')
      const gemini_temperature = config.get<number>('geminiCoder.temperature')

      const default_model_name = model_manager.get_default_fim_model()

      const all_providers = [
        ...BUILT_IN_PROVIDERS.map((provider) => ({
          ...provider,
          apiKey: gemini_api_key || '',
          temperature: gemini_temperature
        })),
        ...user_providers
      ]

      const provider = await get_selected_provider(
        context,
        all_providers,
        default_model_name
      )

      if (!provider) {
        return
      }

      await perform_fim_completion(
        file_tree_provider,
        open_editors_provider,
        context,
        provider,
        false
      )
    }
  )
}

/**
 * Register FIM completion with suggestions using the default model
 */
export function fim_completion_with_suggestions_command(
  file_tree_provider: any,
  open_editors_provider: any,
  context: vscode.ExtensionContext
) {
  const model_manager = new ModelManager(context)

  return vscode.commands.registerCommand(
    'geminiCoder.codeCompletionWithSuggestions',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers =
        config.get<Provider[]>('geminiCoder.providers') || []
      const gemini_api_key = config.get<string>('geminiCoder.apiKey')
      const gemini_temperature = config.get<number>('geminiCoder.temperature')

      const default_model_name = model_manager.get_default_fim_model()

      const all_providers = [
        ...BUILT_IN_PROVIDERS.map((provider) => ({
          ...provider,
          apiKey: gemini_api_key || '',
          temperature: gemini_temperature
        })),
        ...user_providers
      ]

      const provider = all_providers.find((p) => p.name == default_model_name)

      if (!provider) {
        vscode.window.showErrorMessage('Default model is not set or valid.')
        return
      }

      await perform_fim_completion(
        file_tree_provider,
        open_editors_provider,
        context,
        provider,
        true
      )
    }
  )
}

/**
 * Register FIM completion with suggestions with model selection
 */
export function fim_completion_with_suggestions_with_command(
  file_tree_provider: any,
  open_editors_provider: any,
  context: vscode.ExtensionContext
) {
  const model_manager = new ModelManager(context)

  return vscode.commands.registerCommand(
    'geminiCoder.codeCompletionWithSuggestionsWith',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers =
        config.get<Provider[]>('geminiCoder.providers') || []
      const gemini_api_key = config.get<string>('geminiCoder.apiKey')
      const gemini_temperature = config.get<number>('geminiCoder.temperature')

      const default_model_name = model_manager.get_default_fim_model()

      const all_providers = [
        ...BUILT_IN_PROVIDERS.map((provider) => ({
          ...provider,
          apiKey: gemini_api_key || '',
          temperature: gemini_temperature
        })),
        ...user_providers
      ]

      const provider = await get_selected_provider(
        context,
        all_providers,
        default_model_name
      )

      if (!provider) {
        return
      }

      await perform_fim_completion(
        file_tree_provider,
        open_editors_provider,
        context,
        provider,
        true
      )
    }
  )
}
