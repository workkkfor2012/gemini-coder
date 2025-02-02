import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

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

      let last_chat_instruction =
        context.globalState.get<string>('lastChatInstruction') || ''

      const instruction = await vscode.window.showInputBox({
        prompt: 'Enter your instruction',
        placeHolder: 'e.g., "Our task is to..."',
        value: last_chat_instruction
      })

      if (!instruction) {
        return
      }

      await context.globalState.update('lastChatInstruction', instruction)

      const focused_file = vscode.window.activeTextEditor?.document.uri.fsPath

      // Get context from selected files
      let context_text = ''
      const added_files = new Set<string>()

      // Add selected files from the file tree
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

      // Add currently open files
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

      // Construct the final text
      const final_text = `<files>${context_text}\n</files>\n${instruction}`

      await vscode.env.clipboard.writeText(final_text)

      const url = 'https://aistudio.google.com/app/prompts/new_chat'
      vscode.env.openExternal(vscode.Uri.parse(url))
    }
  )
}
