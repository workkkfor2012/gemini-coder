import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { replace_selection_placeholder } from '../utils/replace-selection-placeholder'

export function chat_to_clipboard_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.chatToClipboard',
    async () => {
      const last_chat_prompt =
        context.workspaceState.get<string>('last-chat-prompt') || ''

      const input_box = vscode.window.createInputBox()
      input_box.prompt = 'Ask anything'
      input_box.placeholder = 'e.g., "Our task is to..."'
      input_box.value = last_chat_prompt

      input_box.onDidChangeValue(async (value) => {
        await context.workspaceState.update('last-chat-prompt', value)
      })

      let instruction = await new Promise<string | undefined>((resolve) => {
        input_box.onDidAccept(() => {
          resolve(input_box.value)
          input_box.hide()
        })
        input_box.onDidHide(() => resolve(undefined))
        input_box.show()
      })

      if (!instruction) {
        return // User cancelled
      }

      const current_history = context.workspaceState.get<string[]>(
        'chat-history',
        []
      )
      const updated_history = [instruction, ...current_history].slice(0, 100)
      await context.workspaceState.update('chat-history', updated_history)

      const files_collector = new FilesCollector(
        file_tree_provider,
        open_editors_provider
      )
      let context_text = ''

      try {
        const active_editor = vscode.window.activeTextEditor
        const active_path = active_editor?.document.uri.fsPath

        context_text = await files_collector.collect_files({
          active_path
        })
      } catch (error: any) {
        console.error('Error collecting files:', error)
        vscode.window.showErrorMessage(
          'Error collecting files: ' + error.message
        )
        return
      }

      instruction = replace_selection_placeholder(instruction)

      const config = vscode.workspace.getConfiguration()
      const chat_style_instructions = config.get<string>(
        'geminiCoder.chatStyleInstructions',
        ''
      )

      if (chat_style_instructions) {
        instruction += `\n${chat_style_instructions}`
      }

      const text = `${
        context_text ? `${instruction}\n<files>\n${context_text}</files>\n` : ''
      }${instruction}`

      await vscode.env.clipboard.writeText(text)
      vscode.window.showInformationMessage('Chat prompt copied to clipboard!')
    }
  )
}
