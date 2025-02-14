import * as vscode from 'vscode'
import { Provider } from '../types/provider'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'
import { update_status_bar } from '../status-bar/create-default-model-status-bar-item'

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
      const current_default_model = config.get<string>(
        'geminiCoder.defaultModel'
      )

      if (!all_providers || all_providers.length == 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        )
        return
      }

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = all_providers.map((p) => ({
        label: p.name,
        description:
          p.name == current_default_model ? 'Default model' : ''
      }))
      quick_pick.placeholder = 'Select default model for FIM completions'

      // Set the active items to the current default model
      if (current_default_model) {
        const current_item = quick_pick.items.find(
          (item) => item.label == current_default_model
        )
        if (current_item) {
          quick_pick.activeItems = [current_item]
        }
      }

      quick_pick.onDidAccept(async () => {
        const selected_provider = quick_pick.selectedItems[0]?.label
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
        quick_pick.dispose()
      })

      quick_pick.show()
    }
  )
}
