import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'

export function chat_to_clipboard_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.chatToClipboard',
    async () => {
      // Main Instruction Input
      let last_chat_prompt =
        context.globalState.get<string>('lastChatPrompt') || ''

      const instruction = await vscode.window.showInputBox({
        prompt: 'Ask anything',
        placeHolder: 'e.g., "Our task is to..."',
        value: last_chat_prompt
      })

      if (!instruction) {
        return // User cancelled
      }

      await context.globalState.update('lastChatPrompt', instruction)

      // Files Collection using FilesCollector
      const files_collector = new FilesCollector(file_tree_provider)
      let context_text = ''

      try {
        // Collect files
        context_text = await files_collector.collect_files()
      } catch (error: any) {
        console.error('Error collecting files:', error)
        vscode.window.showErrorMessage(
          'Error collecting files: ' + error.message
        )
        return
      }

      const final_text = `${
        context_text ? `<files>\n${context_text}\n</files>\n` : ''
      }${instruction}`

      await vscode.env.clipboard.writeText(final_text)
      vscode.window.showInformationMessage('Chat prompt copied to clipboard')
    }
  )
}
