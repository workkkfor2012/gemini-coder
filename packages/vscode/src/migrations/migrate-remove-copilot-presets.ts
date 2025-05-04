import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'

/**
 * Migration to remove any presets with chatbots set to "GitHub Copilot"
 * since it's not a supported chatbot in the extension
 */
export async function migrate_remove_copilot_presets(): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('geminiCoder')
    const presets: any[] | undefined = config.get('presets')

    if (!presets || presets.length === 0) {
      return // No presets to migrate
    }

    // Filter out any presets with chatbot set to "GitHub Copilot"
    const filteredPresets = presets.filter(
      (preset) => preset.chatbot != 'GitHub Copilot'
    )

    // Only update if we actually removed something
    if (filteredPresets.length < presets.length) {
      await config.update(
        'presets',
        filteredPresets,
        vscode.ConfigurationTarget.Global
      )

      Logger.log({
        function_name: 'migrate_remove_copilot_presets',
        message: `Removed ${
          presets.length - filteredPresets.length
        } presets with GitHub Copilot chatbot`
      })
    }
  } catch (error) {
    Logger.error({
      function_name: 'migrate_remove_copilot_presets',
      message: 'Error removing GitHub Copilot presets',
      data: error
    })
  }
}
