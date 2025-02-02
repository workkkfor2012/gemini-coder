import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { autocomplete_instruction } from '../constants/instructions'

export function open_web_chat_with_fim_completion_prompt_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.openWebChatWithFimCompletionPrompt',
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
      const position = editor.selection.active

      const text_before_cursor = document.getText(
        new vscode.Range(new vscode.Position(0, 0), position)
      )
      const text_after_cursor = document.getText(
        new vscode.Range(
          position,
          document.positionAt(document.getText().length)
        )
      )

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

      const payload = {
        before: `<files>${context_text}\n<file path="${vscode.workspace.asRelativePath(
          document.uri
        )}">\n${text_before_cursor}`,
        after: `${text_after_cursor}\n</file>\n</files>`
      }

      let content = `${payload.before}<fill missing code>${payload.after}\n${autocomplete_instruction}`

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
        // Add <temperature> tag if AI Studio is selected
        if (selected_chat.label === 'AI Studio') {
          const ai_studio_temperature = vscode.workspace
            .getConfiguration()
            .get<number>('geminiCoder.aiStudioTemperature')
          content = `<temperature>${ai_studio_temperature}</temperature>${content}`
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
