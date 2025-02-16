import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'

export function compose_chat_prompt_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.composeChatPrompt',
    async () => {
      const config = vscode.workspace.getConfiguration()

      // Prompt Prefix Selection
      const prompt_prefixes = config.get<string[]>(
        'geminiCoder.promptPrefixes',
        []
      )
      const last_prompt_prefix =
        context.globalState.get<string>('lastPromptPrefix') || ''

      const prefix_quick_pick_items = [
        ...(last_prompt_prefix
          ? [
              {
                label: last_prompt_prefix,
                description: 'Last used'
              }
            ]
          : []),
        { label: 'None', description: "Don't use prompt prefix" },
        ...prompt_prefixes
          .filter((prefix) => prefix != last_prompt_prefix)
          .map((prefix) => ({
            label: prefix
          }))
      ]

      const selected_prefix = await vscode.window.showQuickPick(
        prefix_quick_pick_items,
        {
          placeHolder: 'Select a prompt prefix (optional)'
        }
      )

      if (!selected_prefix) {
        return // User cancelled
      }

      const prompt_prefix =
        selected_prefix.label != 'None' ? selected_prefix.label : ''

      await context.globalState.update('lastPromptPrefix', prompt_prefix)

      // Main Instruction Input
      let last_chat_prompt =
        context.globalState.get<string>('lastChatPrompt') || ''

      const instruction = await vscode.window.showInputBox({
        prompt: 'Type something',
        placeHolder: 'e.g., "Our task is to..."',
        value: last_chat_prompt
      })

      if (!instruction) {
        return // User cancelled
      }

      await context.globalState.update('lastChatPrompt', instruction)

      // Prompt Suffix Selection
      const prompt_suffixes = config.get<string[]>(
        'geminiCoder.promptSuffixes',
        []
      )

      const last_prompt_suffix =
        context.globalState.get<string>('lastPromptSuffix') || ''

      const suffix_quick_pick_items = [
        ...(last_prompt_suffix
          ? [
              {
                label: last_prompt_suffix,
                description: 'Last used'
              }
            ]
          : []),
        { label: 'None', description: "Don't use prompt suffix" },
        ...prompt_suffixes
          .filter((suffix) => suffix !== last_prompt_suffix)
          .map((suffix) => ({
            label: suffix
          }))
      ]

      const selected_suffix = await vscode.window.showQuickPick(
        suffix_quick_pick_items,
        {
          placeHolder: 'Select a prompt suffix (optional)'
        }
      )

      if (!selected_suffix) {
        return // User cancelled
      }

      const prompt_suffix =
        selected_suffix.label != 'None' ? selected_suffix.label : ''
      await context.globalState.update('lastPromptSuffix', prompt_suffix)

      // Create files collector instance and collect files
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

      let final_instruction = instruction
      if (prompt_prefix) {
        final_instruction = `${prompt_prefix.trim()} ${final_instruction}`
      }
      if (prompt_suffix) {
        final_instruction = `${final_instruction} ${prompt_suffix.trim()}`
      }

      let final_text = `${
        context_text ? `<files>${context_text}\n</files>\n` : ''
      }${final_instruction}`

      await vscode.env.clipboard.writeText(final_text)
      vscode.window.showInformationMessage('Chat prompt copied to clipboard!')
    }
  )
}
