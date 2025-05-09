import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'

const settings_map = {
  codeCompletionsSettings: 'apiToolCodeCompletionsSettings',
  fileRefactoringSettings: 'apiToolFileRefactoringSettings',
  commitMessagesSettings: 'apiToolCommitMessageSettings',
  applyChatResponseSettings: 'apiToolFileRefactoringSettings'
}

const MIGRATION_ID = 'api-tool-settings-migration-090605' // Added unique ID

/**
 * Migration to rename settings to use apiTool prefix for consistency
 * The following settings are renamed:
 * - codeCompletionsSettings -> apiToolCodeCompletionsSettings
 * - fileRefactoringSettings -> apiToolFileRefactoringSettings
 * - commitMessagesSettings -> apiToolCommitMessageSettings
 * This migration runs only once per extension installation.
 */
export async function migrate_api_tool_settings(
  context: vscode.ExtensionContext // Added context parameter
): Promise<void> {
  try {
    // Check if migration has already run
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.log({
        function_name: 'migrate_api_tool_settings',
        message: 'API tool settings migration already completed. Skipping.'
      })
      return
    }

    const config = vscode.workspace.getConfiguration('geminiCoder')
    let migrated_count = 0

    for (const [old_key, new_key] of Object.entries(settings_map)) {
      const old_value = config.get(old_key)

      // Skip if old setting doesn't exist
      if (old_value === undefined) {
        continue
      }

      // Transfer value to new setting
      await config.update(new_key, old_value, vscode.ConfigurationTarget.Global)

      // Remove old setting
      await config.update(old_key, undefined, vscode.ConfigurationTarget.Global)

      migrated_count++
    }

    if (migrated_count > 0) {
      Logger.log({
        function_name: 'migrate_api_tool_settings',
        message: `Successfully migrated ${migrated_count} API tool settings`
      })
    } else {
      Logger.log({
        function_name: 'migrate_api_tool_settings',
        message: 'No API tool settings found to migrate.'
      })
    }

    // Mark migration as completed
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_api_tool_settings',
      message: 'Error migrating API tool settings',
      data: error
    })
    // Do NOT mark as completed if an error occurred
  }
}
