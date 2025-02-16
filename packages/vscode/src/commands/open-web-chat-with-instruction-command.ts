import * as vscode from 'vscode'
import { AI_STUDIO_MODELS } from '../constants/ai-studio-models'
import { WEB_CHATS } from '../constants/web-chats'
import { FilesCollector } from '../helpers/files-collector'

export function open_web_chat_with_instruction_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.openWebChatWithInstruction',
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

      // Web Chat Selection
      const ai_studio = WEB_CHATS.find((chat) => chat.label === 'AI Studio')!
      const other_chats = WEB_CHATS.filter((chat) => chat.label !== 'AI Studio')

      const quick_pick_items = [
        {
          label: ai_studio.label,
          url: `${ai_studio.url}#gemini-coder`
        },
        ...other_chats.map((chat) => ({
          label: chat.label,
          url: `${chat.url}#gemini-coder`
        }))
      ]

      let last_used_web_chats = context.globalState.get<string[]>(
        'lastUsedWebChats',
        []
      )

      last_used_web_chats = last_used_web_chats.filter((chat_name) =>
        quick_pick_items.some((item) => item.label == chat_name)
      )

      const prioritized_quick_pick_items = [
        ...last_used_web_chats
          .map((chat_name) =>
            quick_pick_items.find((item) => item.label == chat_name)
          )
          .filter((item) => item !== undefined),
        ...quick_pick_items.filter(
          (item) => !last_used_web_chats.includes(item.label)
        )
      ]

      let selected_chat =
        WEB_CHATS.length > 1
          ? await vscode.window.showQuickPick(prioritized_quick_pick_items, {
              placeHolder: 'Select web chat to open'
            })
          : { label: ai_studio.label, url: `${ai_studio.url}#gemini-coder` }

      if (selected_chat) {
        if (selected_chat.label == 'AI Studio') {
          const current_ai_studio_model = config.get<string>(
            'geminiCoder.aiStudioModel'
          )

          const model_quick_pick_items = AI_STUDIO_MODELS.map((model) => ({
            label: model.label,
            description:
              model.name == current_ai_studio_model ? 'Last used' : '',
            name: model.name
          }))

          // Sort to show the last used model first
          model_quick_pick_items.sort((a, b) => {
            if (a.description == 'Last used') {
              return -1
            }
            if (b.description == 'Last used') {
              return 1
            }
            return 0
          })

          const ai_studio_model = await vscode.window.showQuickPick(
            model_quick_pick_items,
            {
              placeHolder: 'Select AI Studio model'
            }
          )

          if (!ai_studio_model) {
            return // User cancelled
          }

          await vscode.workspace
            .getConfiguration()
            .update(
              'geminiCoder.aiStudioModel',
              ai_studio_model.name,
              vscode.ConfigurationTarget.Global
            )

          const ai_studio_temperature = vscode.workspace
            .getConfiguration()
            .get<number>('geminiCoder.aiStudioTemperature')

          final_text = `<model>${ai_studio_model.name}</model><temperature>${ai_studio_temperature}</temperature>${final_text}`

          const last_system_instruction =
            context.globalState.get<string>('lastSystemInstruction') || ''

          if (last_system_instruction) {
            final_text = `<system>${last_system_instruction}</system>${final_text}`
          }
        }

        await vscode.env.clipboard.writeText(final_text)
        vscode.env.openExternal(vscode.Uri.parse(selected_chat.url))

        last_used_web_chats = [
          selected_chat.label,
          ...last_used_web_chats.filter(
            (chat_name) => chat_name !== selected_chat.label
          )
        ]
        context.globalState.update('lastUsedWebChats', last_used_web_chats)
      } else {
        return // User cancelled
      }
    }
  )
}
