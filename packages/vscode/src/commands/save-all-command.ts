import * as vscode from 'vscode'

export function save_all_command(): vscode.Disposable {
  return vscode.commands.registerCommand('geminiCoder.saveAll', () => {
    return vscode.commands.executeCommand('workbench.action.files.saveAll')
  })
}