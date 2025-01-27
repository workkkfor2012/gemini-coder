import * as vscode from 'vscode'
import { Provider } from '../types/provider'
import { BUILT_IN_PROVIDERS } from '../constants/providers'

export function change_default_provider_command(
  status_bar_item: vscode.StatusBarItem
) {
  return vscode.commands.registerCommand(
    'geminiCoder.changeDefaultProvider',
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

      const is_primary = await vscode.window.showQuickPick(
        ['Primary', 'Secondary'],
        { placeHolder: 'Select type' }
      )

      if (is_primary) {
        const selected_provider = await vscode.window.showQuickPick(
          all_providers.map((p) => p.name),
          { placeHolder: 'Select default model for Gemini Coder' }
        )

        if (selected_provider) {
          await config.update(
            `geminiCoder.${is_primary.toLowerCase()}Model`,
            selected_provider,
            vscode.ConfigurationTarget.Global
          )
          vscode.window.showInformationMessage(
            `Default ${is_primary.toLowerCase()} provider changed to: ${selected_provider}`
          )
          update_status_bar(status_bar_item)
        }
      }
    }
  )
}

async function update_status_bar(status_bar_item: vscode.StatusBarItem) {
  const primary_provider_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiCoder.primaryModel')
  const secondary_provider_name = vscode.workspace
    .getConfiguration()
    .get<string>('geminiCoder.secondaryModel')

  status_bar_item.text = `${primary_provider_name || 'Select Primary Model'} (${
    secondary_provider_name || 'Select Secondary Model'
  })`
  status_bar_item.tooltip = `Change default model`
  status_bar_item.show()
}
