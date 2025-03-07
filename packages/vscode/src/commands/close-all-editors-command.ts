import * as vscode from 'vscode'

export function close_all_editors_command(): vscode.Disposable {
  return vscode.commands.registerCommand('geminiCoder.closeAllEditors', () => {
    return vscode.commands.executeCommand('workbench.action.closeAllEditors')
  })
}
