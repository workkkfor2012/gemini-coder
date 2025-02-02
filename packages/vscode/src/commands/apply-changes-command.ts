import * as vscode from 'vscode'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { Provider } from '../types/provider'
import { make_api_request } from '../helpers/make-api-request'
import { BUILT_IN_PROVIDERS } from '../constants/providers'

export function apply_changes_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
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

      let last_refactor_instruction =
        context.globalState.get<string>('lastRefactorInstruction') || ''
      const instruction = await vscode.window.showInputBox({
        prompt: 'Enter your refactoring instruction',
        placeHolder: 'e.g., "Refactor this code to use async/await"',
        value: last_refactor_instruction
      })

      if (!instruction) {
        return
      }

      last_refactor_instruction = instruction
      await context.globalState.update('lastRefactorInstruction', instruction)

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

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: `Refactoring file...`,
          cancellable: true
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            cancel_token_source.cancel('Refactoring cancelled by user.')
          })

          try {
            let refactored_content = await make_api_request(
              provider,
              body,
              cancel_token_source.token
            )

            if (refactored_content == 'rate_limit') {
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
                vscode.window.showErrorMessage(
                  'No model selected. Request cancelled.'
                )
                return
              }

              provider = all_providers.find(
                (p) => p.name == selected_provider_name
              )!

              body = {
                messages,
                model: provider.model,
                temperature: provider.temperature
              }

              refactored_content = await make_api_request(
                provider,
                body,
                cancel_token_source.token
              )
            }

            if (refactored_content == null) return

            if (!refactored_content) {
              vscode.window.showErrorMessage(
                'Refactoring failed. Please try again later.'
              )
              return
            }

            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document_text.length)
            )
            await editor.edit((editBuilder) => {
              editBuilder.replace(fullRange, refactored_content!)
            })

            vscode.window.showInformationMessage(
              `File refactored with ${provider.name}!`
            )
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
