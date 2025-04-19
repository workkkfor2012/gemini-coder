import * as vscode from 'vscode'
import { Logger } from '../../../helpers/logger'

/**
 * Format document using VS Code's formatDocument command
 */
export async function format_document(
  document: vscode.TextDocument
): Promise<void> {
  Logger.log({
    function_name: 'format_document',
    message: 'start',
    data: document.uri.fsPath
  })
  try {
    await vscode.commands.executeCommand(
      'editor.action.formatDocument',
      document.uri
    )
    Logger.log({
      function_name: 'format_document',
      message: 'Document formatted',
      data: document.uri.fsPath
    })
  } catch (error) {
    Logger.error({
      function_name: 'format_document',
      message: 'Error formatting document',
      data: { error, file: document.uri.fsPath }
    })
    console.error(`Error formatting document: ${error}`)
    // Continue even if formatting fails
  }
}
