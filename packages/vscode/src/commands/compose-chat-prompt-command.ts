import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export function compose_chat_prompt_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.composeChatPrompt',
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
        prompt: 'Enter a prompt',
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

      // Context Building
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

      await vscode.env.clipboard.writeText(final_text)
      vscode.window.showInformationMessage(
        'Chat prompt copied to clipboard!'
      )
    }
  )
}
