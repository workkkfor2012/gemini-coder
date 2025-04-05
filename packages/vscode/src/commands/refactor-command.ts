import * as vscode from 'vscode'
import axios from 'axios'
import { Provider } from '../types/provider'
import { make_api_request } from '../helpers/make-api-request'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'
import { cleanup_api_response } from '../helpers/cleanup-api-response'
import { handle_rate_limit_fallback } from '../helpers/handle-rate-limit-fallback'
import { TEMP_REFACTORING_INSTRUCTION_KEY } from '../status-bar/create-refactor-status-bar-item'
import { FilesCollector } from '../helpers/files-collector'
import { ModelManager } from '../services/model-manager'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '../constants/state-keys'

async function format_document(document: vscode.TextDocument): Promise<void> {
  try {
    await vscode.commands.executeCommand(
      'editor.action.formatDocument',
      document.uri
    )
  } catch (error) {
    console.error(`Error formatting document: ${error}`)
    // Continue even if formatting fails
  }
}

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
  let last_used_models = context.globalState.get<string[]>(
    'lastUsedRefactoringModels',
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
      description: 'Currently set as default'
    },
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
    placeHolder: 'Select a model for code refactoring'
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
  context.globalState.update('lastUsedRefactoringModels', last_used_models)

  return selected_provider
}

export function refactor_command(params: {
  command: string
  context: vscode.ExtensionContext
  file_tree_provider: any
  open_editors_provider?: any
  use_default_model?: boolean
}) {
  const model_manager = new ModelManager(params.context)

  return vscode.commands.registerCommand(params.command, async () => {
    const config = vscode.workspace.getConfiguration()
    const editor = vscode.window.activeTextEditor

    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.')
      return
    }

    // First try to get instruction from workspace state (set by status bar)
    let instruction = params.context.workspaceState.get<string>(
      TEMP_REFACTORING_INSTRUCTION_KEY
    )

    // If no instruction in workspace state (direct command invocation), prompt for one
    if (!instruction) {
      const last_instruction = params.context.globalState.get<string>(
        'lastRefactoringInstruction',
        ''
      )

      instruction = await vscode.window.showInputBox({
        prompt: 'Enter your refactoring instruction',
        placeHolder: 'e.g., "Refactor this code to use async/await"',
        value: last_instruction,
        validateInput: (value) => {
          params.context.globalState.update('lastRefactoringInstruction', value)
          return null
        }
      })

      if (!instruction) {
        return // User cancelled the instruction input
      }
    } else {
      // Clear the temporary instruction immediately after getting it
      await params.context.workspaceState.update(
        TEMP_REFACTORING_INSTRUCTION_KEY,
        undefined
      )
    }

    const document = editor.document
    const document_path = document.uri.fsPath
    const document_text = document.getText()

    // Store original content for potential reversion
    const original_content = document_text

    // Get the relative path of the file in the workspace
    const file_path = vscode.workspace.asRelativePath(document.uri)

    // Determine which workspace this file belongs to (for multi-root workspaces)
    let workspace_name: string | undefined = undefined
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 1
    ) {
      // Find the workspace folder that contains this file
      const workspace_folder = vscode.workspace.getWorkspaceFolder(document.uri)
      if (workspace_folder) {
        workspace_name = workspace_folder.name
      }
    }

    const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
    const gemini_api_key = config.get<string>('geminiCoder.apiKey')
    const gemini_temperature = config.get<number>('geminiCoder.temperature')

    // Get default model from global state instead of config
    const default_model_name = model_manager.get_default_refactoring_model()

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
      if (!provider) {
        vscode.window.showErrorMessage(
          `Default model is not set or invalid. Please set it in the settings.`
        )
        return
      }
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
        'API key is missing. Please add it in the settings.'
      )
      return
    }

    const model = provider.model
    const temperature = provider.temperature
    const system_instructions = provider.systemInstructions
    const verbose = config.get<boolean>('geminiCoder.verbose')

    // Create files collector with both providers
    const files_collector = new FilesCollector(
      params.file_tree_provider,
      params.open_editors_provider
    )

    const collected_files = await files_collector.collect_files({
      exclude_path: document_path
    })

    const current_file_path = vscode.workspace.asRelativePath(document.uri)

    const selection = editor.selection
    const selected_text = editor.document.getText(selection)
    let refactor_instruction = `User requested refactor of file ${current_file_path}. In your response send fully updated <file> only, without explanations or any other text.`
    if (selected_text) {
      refactor_instruction += ` Regarding the following snippet \`\`\`${selected_text}\`\`\` ${instruction}`
    } else {
      refactor_instruction += ` ${instruction}`
    }

    const all_files = `<files>${collected_files}\n<file name="${current_file_path}"><![CDATA[${document_text}]]></file>\n</files>`
    const content = `${all_files}\n${refactor_instruction}`

    const messages = [
      ...(system_instructions
        ? [{ role: 'system', content: system_instructions }]
        : []),
      {
        role: 'user',
        content
      }
    ]

    let body = {
      messages,
      model,
      temperature
    }

    if (verbose) {
      console.log('[Gemini Coder] Refactor Prompt:', content)
    }

    let cancel_token_source = axios.CancelToken.source()

    // Track total length and received length for progress
    const total_length = document_text.length
    let received_length = 0

    // Variables to hold processing results outside the progress scope
    let result_content = ''
    let success = false

    await vscode.window
      .withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Waiting for the updated file...',
          cancellable: true
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            cancel_token_source.cancel('Cancelled by user.')
          })

          try {
            const refactored_content = await make_api_request(
              provider,
              body,
              cancel_token_source.token,
              (chunk: string) => {
                received_length += chunk.length
                progress.report({
                  increment: (chunk.length / total_length) * 100
                })
              }
            )

            if (!refactored_content) {
              vscode.window.showErrorMessage(
                'Refactoring failed. Please try again later.'
              )
              return false
            } else if (refactored_content == 'rate_limit') {
              const fallback_content = await handle_rate_limit_fallback(
                all_providers,
                default_model_name,
                body,
                cancel_token_source.token
              )

              if (!fallback_content) {
                return false
              }

              // Store the cleaned content for use after progress completes
              result_content = cleanup_api_response({
                content: fallback_content
              })
              success = true
              return true
            }

            // Store the cleaned content for use after progress completes
            result_content = cleanup_api_response({
              content: refactored_content
            })
            success = true
            return true
          } catch (error) {
            if (axios.isCancel(error)) return false
            console.error('Refactoring error:', error)
            vscode.window.showErrorMessage(
              'An error occurred during refactoring. See console for details.'
            )
            return false
          }
        }
      )
      .then(async () => {
        // Only proceed if we have successful results
        if (success && result_content) {
          const full_range = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document_text.length)
          )
          await editor.edit((edit_builder) => {
            edit_builder.replace(full_range, result_content)
          })

          // Format the document after refactoring
          await format_document(document)

          // Store original file state for potential reversion using the revert command
          // Include workspace_name for multi-root workspace support
          await params.context.workspaceState.update(
            LAST_APPLIED_CHANGES_STATE_KEY,
            [
              {
                file_path: file_path,
                content: original_content,
                is_new: false,
                workspace_name
              }
            ]
          )

          // Show success message with Revert option
          const response = await vscode.window.showInformationMessage(
            'File has been refactored.',
            'Revert'
          )

          // Handle revert action if selected
          if (response == 'Revert') {
            await editor.edit((editBuilder) => {
              const full_range = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
              )
              editBuilder.replace(full_range, original_content)
            })
            await document.save()
            vscode.window.showInformationMessage(
              'Refactoring has been reverted.'
            )
            // Clear the saved state since we've reverted
            await params.context.workspaceState.update(
              LAST_APPLIED_CHANGES_STATE_KEY,
              null
            )
          }
        }
      })
  })
}
