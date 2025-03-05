import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { WebSocketServer } from '../services/websocket-server'

export function web_chat_with_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  websocket_server_instance: WebSocketServer
) {
  return vscode.commands.registerCommand(
    'geminiCoder.webChatWith',
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
        'geminiCoder.presets',
        []
      )

      // Create quickpick items for presets
      const preset_quick_pick_items = web_chat_presets.map((preset, index) => ({
        label: preset.name,
        description: `${preset.chatbot}${
          preset.model ? ` - ${preset.model}` : ''
        }`,
        index: index
      }))

      // Show quickpick without multi-select
      const selected_preset = await vscode.window.showQuickPick(
        preset_quick_pick_items,
        {
          placeHolder: 'Select a chat preset'
        }
      )

      if (!selected_preset) {
        return // User cancelled
      }

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
        context_text ? `<files>\n${context_text}\n</files>\n` : ''
      }${instruction}`

      // Initialize chat with selected preset
      websocket_server_instance.initialize_chats(final_text, [selected_preset.index])
    }
  )
}

export function web_chat_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  websocket_server_instance: WebSocketServer
) {
  return vscode.commands.registerCommand(
    'geminiCoder.webChat',
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
        'geminiCoder.presets',
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
        'selectedPresets',
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
        'selectedPresets',
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
        context_text ? `${context_text}\n\n` : ''
      }${instruction}`

      // Initialize chats with selected presets
      websocket_server_instance.initialize_chats(final_text, selected_indices)
    }
  )
}
