import * as vscode from 'vscode'
import { Provider } from '../types/provider'
import { BUILT_IN_PROVIDERS } from '../constants/providers'

export function change_default_model_command(
  status_bar_item: vscode.StatusBarItem
) {
  return vscode.commands.registerCommand(
    'geminiCoder.changeDefaultModel',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers =
        config.get<Provider[]>('geminiCoder.providers') || []
      const all_providers = [...BUILT_IN_PROVIDERS, ...user_providers]

      if (!all_providers || all_providers.length == 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        )
        return
      }

      const selected_provider = await vscode.window.showQuickPick(
        all_providers.map((p) => p.name),
        { placeHolder: 'Select default model for Gemini Coder' }
      )

      if (selected_provider) {
        await config.update(
          `geminiCoder.defaultModel`,
          selected_provider,
          vscode.ConfigurationTarget.Global
        )
        vscode.window.showInformationMessage(
          `Default model changed to: ${selected_provider}`
        )
        update_status_bar(status_bar_item)
      }
    }
  )
}

async function update_status_bar(status_bar_item: vscode.StatusBarItem) {
  const default_model_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiCoder.defaultModel')
  status_bar_item.text = `${default_model_name || 'Select Model'}` // Updated status bar text
  status_bar_item.tooltip = `Change default model`
  status_bar_item.show()
}
