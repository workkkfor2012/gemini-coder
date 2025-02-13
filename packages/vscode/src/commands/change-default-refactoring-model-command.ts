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

      if (!all_providers || all_providers.length == 0) {
        vscode.window.showErrorMessage(
          'No providers configured. Please add providers in the settings.'
        )
        return
      }

      const selected_provider = await vscode.window.showQuickPick(
        all_providers.map((p) => p.name),
        { placeHolder: 'Select default model for refactoring commands' }
      )

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
    }
  )
}
