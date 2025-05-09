import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'

const MIGRATION_ID = 'remove-copilot-presets-migration-090605' // Added unique ID

/**
 * Migration to remove any presets with chatbots set to "GitHub Copilot"
 * since it's not a supported chatbot in the extension.
 * This migration runs only once per extension installation.
 */
export async function migrate_remove_copilot_presets(
  context: vscode.ExtensionContext // Added context parameter
): Promise<void> {
  try {
    // Check if migration has already run
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.log({
        function_name: 'migrate_remove_copilot_presets',
        message: 'Remove Copilot presets migration already completed. Skipping.'
      })
      return
    }

    const config = vscode.workspace.getConfiguration('geminiCoder')
    const presets: any[] | undefined = config.get('presets')

    if (!presets || presets.length === 0) {
      Logger.log({
        function_name: 'migrate_remove_copilot_presets',
        message: 'No presets found. No migration needed.'
      })
      // Mark as completed since there's nothing to migrate
      await context.globalState.update(MIGRATION_ID, true)
      return
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
    } else {
      Logger.log({
        function_name: 'migrate_remove_copilot_presets',
        message: 'No presets with GitHub Copilot chatbot found to remove.'
      })
    }

    // Mark migration as completed
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_remove_copilot_presets',
      message: 'Error removing GitHub Copilot presets',
      data: error
    })
    // Do NOT mark as completed if an error occurred
  }
}
