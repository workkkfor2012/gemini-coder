import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'

// Core function that contains the shared logic
async function perform_fim_completion_to_clipboard(
  file_tree_provider: any,
  open_editors_provider: any,
  with_suggestions: boolean = false
) {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found.')
    return
  }

  // Handle suggestions if needed
  let suggestions: string | undefined
  if (with_suggestions) {
    suggestions = await vscode.window.showInputBox({
      placeHolder: 'Enter suggestions for code completion (optional)',
      prompt: 'Provide guidance for the AI to follow when completing your code'
    })

    // If user cancels the input box (not the same as empty input), return
    if (suggestions === undefined) {
      return
    }
  }

  const document = editor.document
  const document_path = document.uri.fsPath
  const position = editor.selection.active

  const text_before_cursor = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  )
  const text_after_cursor = document.getText(
    new vscode.Range(position, document.positionAt(document.getText().length))
  )

  // Create files collector instance
  const files_collector = new FilesCollector(
    file_tree_provider,
    open_editors_provider
  )

  try {
    // Collect files excluding the current document
    const collected_files = await files_collector.collect_files({
      exclude_path: document_path
    })

    const payload = {
      before: `<files>${collected_files}\n<file path="${vscode.workspace.asRelativePath(
        document.uri
      )}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const chat_code_completion_instructions = config.get<string>(
      'chatCodeCompletionInstructions'
    )

    const instructions = `${chat_code_completion_instructions}${
      suggestions ? ` Follow suggestions: ${suggestions}` : ''
    }`

    const content = `${instructions}\n${payload.before}<missing text>${payload.after}\n${instructions}`

    await vscode.env.clipboard.writeText(content)
    vscode.window.showInformationMessage(
      'Code completion prompt has been copied to clipboard.'
    )
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to collect files: ${error.message}`)
  }
}

export function code_completion_to_clipboard_command(
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'codeWebChat.codeCompletionToClipboard',
    async () => {
      await perform_fim_completion_to_clipboard(
        file_tree_provider,
        open_editors_provider,
        false // without suggestions
      )
    }
  )
}

export function code_completion_with_suggestions_to_clipboard_command(
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'codeWebChat.codeCompletionWithSuggestionsToClipboard',
    async () => {
      await perform_fim_completion_to_clipboard(
        file_tree_provider,
        open_editors_provider,
        true // with suggestions
      )
    }
  )
}
