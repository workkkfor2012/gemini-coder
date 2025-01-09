import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { get_chat_url } from '../helpers/get-chat-url'

export function open_web_chat_with_refactor_prompt_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.openWebChatWithRefactorPrompt',
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
      let refactor_instruction = `The following files are part of a Git repository with code. User requested refactor of file "${current_file_path}". In your response send updated file only, without explanations or any other text.`
      if (selected_text) {
        refactor_instruction += ` Regarding the following snippet \`\`\`${selected_text}\`\`\` ${instruction}`
      } else {
        refactor_instruction += ` ${instruction}`
      }

      const payload = {
        before: `<instruction>${refactor_instruction}</instruction>\n<files>${context_text}\n<file path="${current_file_path}">\n${document_text}`,
        after: `\n</file>\n</files>`
      }

      const content = `${payload.before}${payload.after}`

      await vscode.env.clipboard.writeText(content)

      const chat_ui_provider = vscode.workspace
        .getConfiguration()
        .get<string>('geminiCoder.webChat')

      const url = get_chat_url(chat_ui_provider)

      vscode.env.openExternal(vscode.Uri.parse(url))
    }
  )
}
