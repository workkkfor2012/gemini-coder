import * as vscode from 'vscode'
import { env } from 'vscode'

export function open_url_command(params: { command: string; url: string }) {
  return vscode.commands.registerCommand(params.command, () => {
    env.openExternal(vscode.Uri.parse(params.url)).then((success) => {
      if (!success) {
        vscode.window.showErrorMessage('Failed to open url in a web browser.')
      }
    })
  })
}
