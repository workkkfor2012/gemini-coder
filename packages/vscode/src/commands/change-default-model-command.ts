import * as vscode from 'vscode'
import { Provider } from '../types/provider'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'

export type ModelType = 'fim' | 'refactoring' | 'apply_changes'

type ModelConfig = {
  command_id: string
  config_key: string
  display_name: string
  placeholder: string
}

const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  fim: {
    command_id: 'geminiCoder.changeDefaultFimModel',
    config_key: 'geminiCoder.defaultFimModel',
    display_name: 'FIM',
    placeholder: 'Select default model for FIM completions'
  },
  refactoring: {
    command_id: 'geminiCoder.changeDefaultRefactoringModel',
    config_key: 'geminiCoder.defaultRefactoringModel',
    display_name: 'Refactoring',
    placeholder: 'Select default model for file refactoring'
  },
  apply_changes: {
    command_id: 'geminiCoder.changeDefaultApplyChangesModel',
    config_key: 'geminiCoder.defaultApplyChangesModel',
    display_name: 'Apply Changes',
    placeholder: 'Select default model for applying changes'
  }
}

export function change_default_model_command(model_type: ModelType) {
  const config = MODEL_CONFIGS[model_type]

  return vscode.commands.registerCommand(config.command_id, async () => {
    const config = vscode.workspace.getConfiguration()
    const user_providers = config.get<Provider[]>('geminiCoder.providers') || []
    const all_providers = [...BUILT_IN_PROVIDERS, ...user_providers]
    const current_default_model = config.get<string>(config.config_key)

    if (!all_providers || all_providers.length === 0) {
      vscode.window.showErrorMessage(
        'No providers configured. Please add providers in the settings.'
      )
      return
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = all_providers.map((p) => ({
      label: p.name,
      description: p.name == current_default_model ? 'Default model' : ''
    }))
    quick_pick.placeholder = config.placeholder

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
        await config.update(
          config.config_key,
          selected_provider,
          vscode.ConfigurationTarget.Global
        )
        vscode.window.showInformationMessage(
          `Default ${config.display_name} model changed to: ${selected_provider}`
        )
      }
      quick_pick.dispose()
    })

    quick_pick.show()
  })
}
