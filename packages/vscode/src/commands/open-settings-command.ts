import * as vscode from 'vscode'

export const open_settings_command = () => {
  return vscode.commands.registerCommand('geminiCoder.openSettings', () => {
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:robertpiosik.gemini-coder'
    )
  })
}
