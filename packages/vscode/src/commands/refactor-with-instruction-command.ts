import * as vscode from 'vscode'
import axios from 'axios'
import { Provider } from '../types/provider'
import { make_api_request } from '../helpers/make-api-request'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'
import { cleanup_api_response } from '../helpers/cleanup-api-response'
import { handle_rate_limit_fallback } from '../helpers/handle-rate-limit-fallback'
import { TEMP_REFACTORING_INSTRUCTION_KEY } from '../status-bar/create-refactor-status-bar-item'
import { FilesCollector } from '../helpers/files-collector'

export function refactor_with_instruction_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.refactorWithInstruction',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const editor = vscode.window.activeTextEditor

      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.')
        return
      }

      // First try to get instruction from workspace state (set by status bar)
      let instruction = context.workspaceState.get<string>(
        TEMP_REFACTORING_INSTRUCTION_KEY
      )

      // If no instruction in workspace state (direct command invocation), prompt for one
      if (!instruction) {
        const last_instruction = context.globalState.get<string>(
          'lastRefactoringInstruction',
          ''
        )

        instruction = await vscode.window.showInputBox({
          prompt: 'Enter your refactoring instruction',
          placeHolder: 'e.g., "Refactor this code to use async/await"',
          value: last_instruction,
          validateInput: (value) => {
            context.globalState.update('lastRefactoringInstruction', value)
            return null
          }
        })

        if (!instruction) {
          return // User cancelled the instruction input
        }
      } else {
        // Clear the temporary instruction immediately after getting it
        await context.workspaceState.update(
          TEMP_REFACTORING_INSTRUCTION_KEY,
          undefined
        )
      }

      const document = editor.document
      const document_path = document.uri.fsPath
      const document_text = document.getText()

      const user_providers =
        config.get<Provider[]>('geminiCoder.providers') || []
      const default_model_name = config.get<string>(
        'geminiCoder.defaultRefactoringModel'
      )
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
        vscode.window.showErrorMessage(
          `Default model is not set or invalid. Please set it in the settings.`
        )
        return
      }

      let provider = all_providers.find((p) => p.name === default_model_name)!

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
            const model_provider = all_providers.find(
              (p) => p.name == model_name
            )
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
      const selected_item = await vscode.window.showQuickPick(
        quick_pick_items,
        {
          placeHolder: 'Select a model for code refactoring'
        }
      )

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
      context.globalState.update('lastUsedRefactoringModels', last_used_models)

      const model = provider.model
      const temperature = provider.temperature
      const system_instructions = provider.systemInstructions
      const verbose = config.get<boolean>('geminiCoder.verbose')

      if (!provider.bearerToken) {
        vscode.window.showErrorMessage(
          'Bearer token is missing. Please add it in the settings.'
        )
        return
      }

      // Create files collector instance and collect files
      const files_collector = new FilesCollector(file_tree_provider)
      let context_text = ''
      
      try {
        // Collect files excluding the current document
        context_text = await files_collector.collect_files([document_path])
      } catch (error: any) {
        console.error('Error collecting files:', error)
        vscode.window.showErrorMessage(
          'Error collecting files: ' + error.message
        )
        return
      }

      const current_file_path = vscode.workspace.asRelativePath(document.uri)

      const selection = editor.selection
      const selected_text = editor.document.getText(selection)
      let refactor_instruction = `User requested refactor of file ${current_file_path}. In your response send fully updated file only, without explanations or any other text.`
      if (selected_text) {
        refactor_instruction += ` Regarding the following snippet \`\`\`${selected_text}\`\`\` ${instruction}`
      } else {
        refactor_instruction += ` ${instruction}`
      }

      const payload = {
        before: `<files>\n${context_text}\n<file path="${current_file_path}">\n<![CDATA[\n${document_text}`,
        after: '\n]]>\n</file>\n</files>'
      }

      const content = `${payload.before}${payload.after}\n${refactor_instruction}`

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

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Waiting for the updated file',
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
                // Update progress on each chunk
                received_length += chunk.length
                const percentage = Math.min(
                  Math.round((received_length / total_length) * 100),
                  100
                )
                progress.report({
                  message: `${percentage}% received...`,
                  increment: (chunk.length / total_length) * 100
                })
              }
            )

            if (!refactored_content) {
              vscode.window.showErrorMessage(
                'Applying changes failed. Please try again later.'
              )
              return
            } else if (refactored_content == 'rate_limit') {
              const fallback_content = await handle_rate_limit_fallback(
                all_providers,
                default_model_name,
                body,
                cancel_token_source.token
              )

              if (!fallback_content) {
                return
              }

              // Continue with the fallback content
              const cleaned_content = cleanup_api_response({
                content: fallback_content,
                end_with_new_line: true
              })
              const full_range = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document_text.length)
              )
              await editor.edit((edit_builder) => {
                edit_builder.replace(full_range, cleaned_content)
              })

              vscode.window.showInformationMessage(`Changes have been applied!`)
              return
            }

            // Continue with the rest of the code only if we have valid content
            const cleaned_content = cleanup_api_response({
              content: refactored_content,
              end_with_new_line: true
            })

            const full_range = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document_text.length)
            )
            await editor.edit((edit_builder) => {
              edit_builder.replace(full_range, cleaned_content)
            })

            vscode.window.showInformationMessage(`Changes have been applied!`)
          } catch (error) {
            console.error('Refactoring error:', error)
            vscode.window.showErrorMessage(
              'An error occurred during refactoring. See console for details.'
            )
          }
        }
      )
    }
  )
}