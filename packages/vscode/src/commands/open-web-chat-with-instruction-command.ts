import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketServer } from '../services/websocket-server'

export function open_web_chat_with_instruction_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  websocket_server_instance: WebSocketServer
) {
  return vscode.commands.registerCommand(
    'geminiCoder.openWebChatWithInstruction',
    async () => {
      // Check connection status immediately
      if (!websocket_server_instance.is_connected()) {
        vscode.window.showInformationMessage(
          'Could not connect to the web browser. Please check if it is running and if the Gemini Coder Connector is installed.'
        )
        return
      }

      const config = vscode.workspace.getConfiguration()

      // Get web chat presets
      const web_chat_presets = config.get<any[]>(
        'geminiCoder.webChatPresets',
        []
      )

      // Create quickpick items for presets
      const preset_quick_pick_items = web_chat_presets.map((preset, index) => ({
        label: preset.name,
        description: `${preset.chatbot}${
          preset.model ? ` - ${preset.model}` : ''
        }`,
        picked: false,
        index: index
      }))

      // Get previously selected presets from globalState
      const last_selected_indices = context.globalState.get<number[]>(
        'selectedWebChatPresets',
        []
      )

      // Set picked state based on previously selected presets
      preset_quick_pick_items.forEach((item) => {
        item.picked = last_selected_indices.includes(item.index)
      })

      // Show quickpick with multi-select enabled
      const selected_presets = await vscode.window.showQuickPick(
        preset_quick_pick_items,
        {
          placeHolder: 'Select one or more chat presets',
          canPickMany: true
        }
      )

      if (!selected_presets || selected_presets.length == 0) {
        return // User cancelled or didn't select any presets
      }

      // Save selected preset indices to globalState
      const selected_indices = selected_presets.map((preset) => preset.index)
      await context.globalState.update(
        'selectedWebChatPresets',
        selected_indices
      )

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
        context_text ? `<files>${context_text}\n</files>\n` : ''
      }${instruction}`

      // Initialize chats with selected presets
      websocket_server_instance.initialize_chats(final_text, selected_indices)
    }
  )
}
