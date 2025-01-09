import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { get_chat_url } from '../helpers/get-chat-url'

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

      // Retrieve the last used instruction from global state
      let last_instruction =
        context.globalState.get<string>('lastChatInstruction') || ''

      const instruction = await vscode.window.showInputBox({
        prompt: 'Enter your instruction',
        placeHolder: 'e.g., "Our task is to..."',
        value: last_instruction
      })

      if (!instruction) {
        return
      }

      // Store the new instruction in global state
      await context.globalState.update('lastChatInstruction', instruction)

      const editor = vscode.window.activeTextEditor
      const document = editor?.document
      const document_path = document?.uri.fsPath

      let file_paths_to_be_attached: Set<string> = new Set()

      // Add selected files from the file tree
      if (file_tree_provider) {
        const selected_files_paths = file_tree_provider.getCheckedFiles()
        for (const file_path of selected_files_paths) {
          if (file_path !== document_path) {
            file_paths_to_be_attached.add(file_path)
          }
        }
      }

      // Add currently open files
      if (attach_open_files) {
        const open_tabs = vscode.window.tabGroups.all
          .flatMap((group) => group.tabs)
          .map((tab) =>
            tab.input instanceof vscode.TabInputText ? tab.input.uri : null
          )
          .filter((uri): uri is vscode.Uri => uri !== null)

        for (const open_file_uri of open_tabs) {
          if (open_file_uri.fsPath !== document_path) {
            file_paths_to_be_attached.add(open_file_uri.fsPath)
          }
        }
      }

      let context_text = ''
      for (const path_to_be_attached of file_paths_to_be_attached) {
        try {
          const file_content = fs.readFileSync(path_to_be_attached, 'utf8')
          const relative_path = path.relative(
            vscode.workspace.workspaceFolders![0].uri.fsPath,
            path_to_be_attached
          )
          context_text += `\n<file path="${relative_path}">\n<![CDATA[\n${file_content}\n]]>\n</file>`
        } catch (error) {
          console.error(`Error reading file ${path_to_be_attached}:`, error)
        }
      }

      // Get the chat prompt intro from the configuration
      const chat_instruction_preamble = vscode.workspace
        .getConfiguration()
        .get<string>('geminiCoder.chatInstructionPreamble', '')

      // Construct the final text
      const final_text = `<instruction>\n${chat_instruction_preamble} ${instruction}\n</instruction>\n<files>${context_text}\n</files>`

      await vscode.env.clipboard.writeText(final_text)

      // Open the corresponding URL based on the default chat UI provider
      const chat_ui_provider = vscode.workspace
        .getConfiguration()
        .get<string>('geminiCoder.webChat')

      const url = get_chat_url(chat_ui_provider)

      vscode.env.openExternal(vscode.Uri.parse(url))
    }
  )
}
