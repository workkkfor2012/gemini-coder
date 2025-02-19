import * as vscode from 'vscode'
import { AI_STUDIO_MODELS } from '../constants/ai-studio-models'
import { WEB_CHATS } from '../constants/web-chats'
import { FilesCollector } from '../helpers/files-collector'

export function open_web_chat_with_refactoring_instruction_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.openWebChatWithRefactoringInstruction',
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

      const last_instruction = context.globalState.get<string>(
        'lastRefactoringInstruction',
        ''
      )

      const instruction = await vscode.window.showInputBox({
        prompt: 'Enter your refactoring instruction',
        placeHolder: 'e.g., "Refactor this code to use async/await"',
        value: last_instruction,
        validateInput: (value) => {
          context.globalState.update('lastRefactoringInstruction', value)
          return null
        }
      })

      if (!instruction) {
        return // User cancelled
      }

      // Create files collector instance
      const files_collector = new FilesCollector(file_tree_provider)
      const collected_files = await files_collector.collect_files([
        document_path
      ])

      const current_file_path = vscode.workspace.asRelativePath(document.uri)

      const selection = editor.selection
      const selected_text = editor.document.getText(selection)
      let refactor_instruction = `User requested refactor of file "${current_file_path}". In your response send fully updated file only, without explanations or any other text.`
      if (selected_text) {
        refactor_instruction += ` Regarding the following snippet \`\`\`${selected_text}\`\`\` ${instruction}`
      } else {
        refactor_instruction += ` ${instruction}`
      }

      const all_files = `<files>${collected_files}\n<file path="${current_file_path}">\n<![CDATA[\n${document_text}\n]]>\n</file>\n</files>`
      let content = `${all_files}\n${refactor_instruction}`

      // Web chat selection logic starts here:
      const ai_studio = WEB_CHATS.find((chat) => chat.label == 'AI Studio')!
      const other_chats = WEB_CHATS.filter((chat) => chat.label != 'AI Studio')

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

          content = `<model>${ai_studio_model.name}</model><temperature>${ai_studio_temperature}</temperature>${content}`
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
