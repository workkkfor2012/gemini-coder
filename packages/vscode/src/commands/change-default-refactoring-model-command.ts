import * as vscode from 'vscode'
import { Provider } from '../types/provider'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'

export function change_default_refactoring_model_command() {
  return vscode.commands.registerCommand(
    'geminiCoder.changeDefaultRefactoringModel',
    async () => {
      const config = vscode.workspace.getConfiguration()
      const user_providers =
        config.get<Provider[]>('geminiCoder.providers') || []
      const all_providers = [...BUILT_IN_PROVIDERS, ...user_providers]
      const current_default_model = config.get<string>(
        'geminiCoder.defaultRefactoringModel'
      )

      if (!all_providers || all_providers.length == 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        )
        return
      }

      const quickPick = vscode.window.createQuickPick()
      quickPick.items = all_providers.map((p) => ({
        label: p.name,
        description:
          p.name == current_default_model
            ? 'Default model'
            : ''
      }))
      quickPick.placeholder = 'Select default model for refactoring commands'

      // Set the active items to the current default model
      if (current_default_model) {
        const currentItem = quickPick.items.find(
          (item) => item.label == current_default_model
        )
        if (currentItem) {
          quickPick.activeItems = [currentItem]
        }
      }

      quickPick.onDidAccept(async () => {
        const selected_provider = quickPick.selectedItems[0]?.label
        if (selected_provider) {
          await config.update(
            `geminiCoder.defaultRefactoringModel`,
            selected_provider,
            vscode.ConfigurationTarget.Global
          )
          vscode.window.showInformationMessage(
            `Default refactoring model changed to: ${selected_provider}`
          )
        }
        quickPick.dispose()
      })

      quickPick.show()
    }
  )
}
