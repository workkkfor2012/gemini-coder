import * as vscode from 'vscode'

export const open_settings_command = () => {
  return vscode.commands.registerCommand('codeWebChat.openSettings', () => {
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      '@ext:robertpiosik.gemini-coder'
    )
  })
}
