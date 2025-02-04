import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { AI_STUDIO_MODELS } from '../constants/ai-studio-models'

export function open_web_chat_with_instruction_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.openWebChatWithInstruction',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const attach_open_files = config.get<boolean>(
        'geminiCoder.attachOpenFiles'
      )
      const set_focused_attribute = config.get<boolean>(
        'geminiCoder.setFocusedAttribute',
        true
      )

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
        selected_suffix.label !== 'None' ? selected_suffix.label : ''
      await context.globalState.update('lastPromptSuffix', prompt_suffix)

      // Context Building (Same as before)
      const focused_file = vscode.window.activeTextEditor?.document.uri.fsPath
      let context_text = ''
      const added_files = new Set<string>()

      if (file_tree_provider) {
        const selected_files_paths = file_tree_provider.getCheckedFiles()
        for (const file_path of selected_files_paths) {
          try {
            const file_content = fs.readFileSync(file_path, 'utf8')
            const relative_path = path.relative(
              vscode.workspace.workspaceFolders![0].uri.fsPath,
              file_path
            )
            const focused_attr =
              set_focused_attribute && file_path == focused_file
                ? ' focused="true"'
                : ''
            context_text += `\n<file path="${relative_path}"${focused_attr}>\n<![CDATA[\n${file_content}\n]]>\n</file>`
            added_files.add(file_path)
          } catch (error) {
            console.error(`Error reading file ${file_path}:`, error)
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
          const file_path = open_file_uri.fsPath
          if (!added_files.has(file_path)) {
            try {
              const file_content = fs.readFileSync(file_path, 'utf8')
              const relative_path = path.relative(
                vscode.workspace.workspaceFolders![0].uri.fsPath,
                file_path
              )
              const focused_attr =
                set_focused_attribute && file_path == focused_file
                  ? ' focused="true"'
                  : ''
              context_text += `\n<file path="${relative_path}"${focused_attr}>\n<![CDATA[\n${file_content}\n]]>\n</file>`
              added_files.add(file_path)
            } catch (error) {
              console.error(`Error reading open file ${file_path}:`, error)
            }
          }
        }
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
      const additional_web_chats = config.get<any[]>(
        'geminiCoder.additionalWebChats',
        []
      )

      const ai_studio = {
        label: 'AI Studio',
        url: 'https://aistudio.google.com/app/prompts/new_chat#gemini-coder'
      }

      const quick_pick_items = [
        ai_studio,
        ...additional_web_chats.map((chat) => ({
          label: chat.name,
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
        additional_web_chats.length > 0
          ? await vscode.window.showQuickPick(prioritized_quick_pick_items, {
              placeHolder: 'Select web chat to open'
            })
          : ai_studio

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

          // final_text = `<model>${ai_studio_model.name}</model><temperature>${ai_studio_temperature}</temperature>${final_text}`
          final_text = `<model>${ai_studio_model.name}</model>${final_text}`

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
