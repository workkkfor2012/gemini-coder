import * as vscode from 'vscode'
import { autocomplete_instruction_external } from '../constants/instructions'
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
    new vscode.Range(
      position,
      document.positionAt(document.getText().length)
    )
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
      before: `<files>${collected_files}\n<file name="${vscode.workspace.asRelativePath(
        document.uri
      )}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const content = `${payload.before}<fill missing code>${payload.after}\n${autocomplete_instruction_external}${
      suggestions ? ` Follow suggestions: ${suggestions}` : ''
    }`

    await vscode.env.clipboard.writeText(content)
    vscode.window.showInformationMessage(
      'Autocomplete prompt copied to clipboard!'
    )
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to collect files: ${error.message}`
    )
  }
}

/**
 * Register FIM completion to clipboard command
 */
export function fim_completion_to_clipboard_command(
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.codeCompletionToClipboard',
    async () => {
      await perform_fim_completion_to_clipboard(
        file_tree_provider, 
        open_editors_provider,
        false // without suggestions
      )
    }
  )
}

/**
 * Register FIM completion with suggestions to clipboard command
 */
export function fim_completion_with_suggestions_to_clipboard_command(
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.codeCompletionWithSuggestionsToClipboard',
    async () => {
      await perform_fim_completion_to_clipboard(
        file_tree_provider, 
        open_editors_provider,
        true // with suggestions
      )
    }
  )
}