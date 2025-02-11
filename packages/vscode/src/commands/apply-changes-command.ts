import * as vscode from 'vscode'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { Provider } from '../types/provider'
import { make_api_request } from '../helpers/make-api-request'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'

// Helper function to clean up the API response
function cleanup_api_response(content: string): string {
  const markdown_code_regex = /^```[\s\S]*?\n([\s\S]*?)\n```\s*$/m
  const file_tag_regex = /<file[^>]*>([\s\S]*?)<\/file>/
  const cdata_regex = /<!\[CDATA\[([\s\S]*?)\]\]>/

  // Improved markdown code block handling
  const markdown_match = content.match(markdown_code_regex)
  if (markdown_match) {
    // Extract the content between the code block markers and trim any extra whitespace
    content = markdown_match[1].trim()
  }

  // Then try to extract content from file tags if present
  const file_tag_match = content.match(file_tag_regex)
  if (file_tag_match) {
    content = file_tag_match[1]
  }

  // First try to extract content from CDATA if present
  const cdata_match = content.match(cdata_regex)
  if (cdata_match) {
    content = cdata_match[1]
  }

  // Trim any leading/trailing whitespace while preserving intentional newlines in the code
  return content.trim()
}

export function apply_changes_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.applyChanges',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const editor = vscode.window.activeTextEditor

      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.')
        return
      }

      const document = editor.document
      const document_path = document.uri.fsPath
      const document_text = document.getText()

      const clipboard_text = await vscode.env.clipboard.readText()

      const instruction = await vscode.window.showInputBox({
        prompt: 'Enter your refactoring instruction',
        placeHolder: 'e.g., "Refactor this code to use async/await"',
        value: clipboard_text
      })

      if (!instruction) {
        return // User cancelled
      }

      const user_providers =
        config.get<Provider[]>('geminiCoder.providers') || []
      const default_model_name = config.get<string>('geminiCoder.defaultModel')
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
      context.globalState.update('lastUsedModels', last_used_models)

      const model = provider.model
      const temperature = provider.temperature
      const system_instructions = provider.systemInstructions
      const verbose = config.get<boolean>('geminiCoder.verbose')
      const attach_open_files = config.get<boolean>(
        'geminiCoder.attachOpenFiles'
      )

      if (!provider.bearerToken) {
        vscode.window.showErrorMessage(
          'Bearer token is missing. Please add it in the settings.'
        )
        return
      }

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
      const current_file_path = vscode.workspace.asRelativePath(document.uri)

      const selection = editor.selection
      const selected_text = editor.document.getText(selection)
      let refactor_instruction = `User requested refactor of file "${current_file_path}". In your response send updated file only, without explanations or any other text.`
      if (selected_text) {
        refactor_instruction += ` Regarding the following snippet \`\`\`${selected_text}\`\`\` ${instruction}`
      } else {
        refactor_instruction += ` ${instruction}`
      }

      const payload = {
        before: `<files>${context_text}\n<file path="${current_file_path}">\n${document_text}`,
        after: `\n</file>\n</files>`
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
          title: 'Getting updated file',
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
                  message: `${percentage}% generated...`,
                  increment: (chunk.length / total_length) * 100
                })
              }
            )

            if (!refactored_content) {
              vscode.window.showErrorMessage(
                'Applying changes failed. Please try again later.'
              )
              return
            }

            // Clean up the API response before applying it to the editor
            const cleaned_content = cleanup_api_response(refactored_content)

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
