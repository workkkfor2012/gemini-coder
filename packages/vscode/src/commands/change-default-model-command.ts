import * as vscode from 'vscode'
import { Provider } from '../types/provider'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'

export type ModelType = 'fim' | 'refactoring' | 'apply_changes'

type ModelConfig = {
  commandId: string
  configKey: string
  displayName: string
  placeholderText: string
}

const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  fim: {
    commandId: 'geminiCoder.changeDefaultFimModel',
    configKey: 'geminiCoder.defaultFimModel',
    displayName: 'FIM',
    placeholderText: 'Select default model for FIM completions'
  },
  refactoring: {
    commandId: 'geminiCoder.changeDefaultRefactoringModel',
    configKey: 'geminiCoder.defaultRefactoringModel',
    displayName: 'Refactoring',
    placeholderText: 'Select default model for refactoring'
  },
  apply_changes: {
    commandId: 'geminiCoder.changeDefaultApplyChangesModel',
    configKey: 'geminiCoder.defaultApplyChangesModel',
    displayName: 'Apply Changes',
    placeholderText: 'Select default model for applying changes'
  }
}

export function change_default_model_command(modelType: ModelType) {
  const config = MODEL_CONFIGS[modelType]

  return vscode.commands.registerCommand(config.commandId, async () => {
    const workspaceConfig = vscode.workspace.getConfiguration()
    const user_providers =
      workspaceConfig.get<Provider[]>('geminiCoder.providers') || []
    const all_providers = [...BUILT_IN_PROVIDERS, ...user_providers]
    const current_default_model = workspaceConfig.get<string>(config.configKey)

    if (!all_providers || all_providers.length === 0) {
      vscode.window.showErrorMessage(
        'No providers configured. Please add providers in the settings.'
      )
      return
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = all_providers.map((p) => ({
      label: p.name,
      description: p.name === current_default_model ? 'Default model' : ''
    }))
    quick_pick.placeholder = config.placeholderText

    // Set the active items to the current default model
    if (current_default_model) {
      const current_item = quick_pick.items.find(
        (item) => item.label === current_default_model
      )
      if (current_item) {
        quick_pick.activeItems = [current_item]
      }
    }

    quick_pick.onDidAccept(async () => {
      const selected_provider = quick_pick.selectedItems[0]?.label
      if (selected_provider) {
        await workspaceConfig.update(
          config.configKey,
          selected_provider,
          vscode.ConfigurationTarget.Global
        )
        vscode.window.showInformationMessage(
          `Default ${config.displayName} model changed to: ${selected_provider}`
        )
      }
      quick_pick.dispose()
    })

    quick_pick.show()
  })
}
