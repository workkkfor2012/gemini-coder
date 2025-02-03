import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { AI_STUDIO_MODELS } from '../constants/ai-studio-models'

export function open_web_chat_with_apply_changes_prompt_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.openWebChatWithApplyChangesPrompt',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const attach_open_files = config.get<boolean>(
        'geminiCoder.attachOpenFiles'
      )

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

      await context.globalState.update('lastRefactorInstruction', instruction)

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

      let content = `${payload.before}${payload.after}\n${refactor_instruction}`

      // Web chat selection logic starts here:
      const additional_web_chats = vscode.workspace
        .getConfiguration()
        .get<any[]>('geminiCoder.additionalWebChats', [])

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

      // Get the last used web chats from global state
      let last_used_web_chats = context.globalState.get<string[]>(
        'lastUsedWebChats',
        []
      )

      // Filter out invalid web chat names
      last_used_web_chats = last_used_web_chats.filter((chat_name) =>
        quick_pick_items.some((item) => item.label == chat_name)
      )

      // Construct the quick pick items, prioritizing last used chats
      const prioritized_quick_pick_items = [
        ...last_used_web_chats
          .map((chat_name) =>
            quick_pick_items.find((item) => item.label == chat_name)
          )
          .filter((item) => item !== undefined), // Filter out undefined items
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

          // content = `<model>${ai_studio_model.name}</model><temperature>${ai_studio_temperature}</temperature>${content}`
          content = `<model>${ai_studio_model.name}</model>${content}`
        }

        await vscode.env.clipboard.writeText(content)
        vscode.env.openExternal(vscode.Uri.parse(selected_chat.url))

        // Update the last used web chats in global state
        last_used_web_chats = [
          selected_chat.label,
          ...last_used_web_chats.filter(
            (chat_name) => chat_name !== selected_chat.label
          )
        ]
        context.globalState.update('lastUsedWebChats', last_used_web_chats)
      } else {
        // If no chat is selected, do nothing
        return
      }
    }
  )
}
