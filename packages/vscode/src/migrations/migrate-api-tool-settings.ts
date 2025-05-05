import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'

const settings_map = {
  codeCompletionsSettings: 'apiToolCodeCompletionsSettings',
  fileRefactoringSettings: 'apiToolFileRefactoringSettings',
  commitMessagesSettings: 'apiToolCommitMessageSettings'
}

/**
 * Migration to rename settings to use apiTool prefix for consistency
 * The following settings are renamed:
 * - codeCompletionsSettings -> apiToolCodeCompletionsSettings
 * - fileRefactoringSettings -> apiToolFileRefactoringSettings
 * - commitMessagesSettings -> apiToolCommitMessageSettings
 */
export async function migrate_api_tool_settings(): Promise<void> {
  try {
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
    }
  } catch (error) {
    Logger.error({
      function_name: 'migrate_api_tool_settings',
      message: 'Error migrating API tool settings',
      data: error
    })
  }
}
