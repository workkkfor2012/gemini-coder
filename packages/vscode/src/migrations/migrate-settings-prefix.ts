import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'

const OLD_PREFIX = 'geminiCoder'
const NEW_PREFIX = 'codeWebChat'
const MIGRATION_ID = 'settings-prefix-migration-090525'

const SETTING_KEY_SUFFIXES_TO_MIGRATE = [
  // Current settings from package.json
  'commitMessagePrompt',
  'ignoredExtensions',
  'editFormat',
  'editFormatSelectorVisibility',
  'editFormatInstructionsTruncated',
  'editFormatInstructionsWhole',
  'editFormatInstructionsDiff',
  'chatCodeCompletionInstructions',
  'presets',
  'apiToolCodeCompletionsSettings',
  'apiToolFileRefactoringSettings',
  'apiToolCommitMessageSettings'
]

/**
 * Migration to rename all settings keys from 'geminiCoder.*' to 'codeWebChat.*'
 * in the user's settings.json (global and workspace).
 * This migration runs only once per extension installation.
 * @param context The extension context, used for global state.
 */
export async function migrate_settings_prefix(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Check if migration has already run
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.log({
        function_name: 'migrate_settings_prefix',
        message: 'Settings prefix migration already completed. Skipping.'
      })
      return
    }

    const old_config = vscode.workspace.getConfiguration(OLD_PREFIX)
    const new_config = vscode.workspace.getConfiguration(NEW_PREFIX)
    let migrated_settings_count = 0
    const migrated_keys_info: { key: string; scopes: string[] }[] = []

    for (const key_suffix of SETTING_KEY_SUFFIXES_TO_MIGRATE) {
      const inspection = old_config.inspect(key_suffix)
      let key_migrated_in_any_scope = false
      const scopes_migrated_for_key: string[] = []

      if (inspection) {
        // Migrate global value if it exists
        if (inspection.globalValue !== undefined) {
          await new_config.update(
            key_suffix,
            inspection.globalValue,
            vscode.ConfigurationTarget.Global
          )
          key_migrated_in_any_scope = true
          scopes_migrated_for_key.push('Global')
        }
        // Migrate workspace value if it exists
        if (inspection.workspaceValue !== undefined) {
          await new_config.update(
            key_suffix,
            inspection.workspaceValue,
            vscode.ConfigurationTarget.Workspace
          )
          key_migrated_in_any_scope = true
          scopes_migrated_for_key.push('Workspace')
        }
        // Migrate workspace folder value if it exists
        // Note: Updating workspaceFolderValue programmatically for all folders is complex
        // as it requires specific folder URIs. We'll log and advise manual migration.
        if (inspection.workspaceFolderValue !== undefined) {
          // We cannot reliably update this without knowing the specific workspace folder URI.
          // We will leave the old value and log a warning.
          // The user will have to manually move this setting if defined at a folder level.
          Logger.warn({
            function_name: 'migrate_settings_prefix',
            message: `Setting '${OLD_PREFIX}.${key_suffix}' found with a Workspace Folder specific value. Please manually migrate this to '${NEW_PREFIX}.${key_suffix}' in the respective .vscode/settings.json file.`
          })
        }

        if (key_migrated_in_any_scope) {
          migrated_settings_count++
          migrated_keys_info.push({
            key: key_suffix,
            scopes: scopes_migrated_for_key
          })
        }
      }
    }

    if (migrated_settings_count > 0) {
      Logger.log({
        function_name: 'migrate_settings_prefix',
        message: `Successfully migrated ${migrated_settings_count} settings from '${OLD_PREFIX}.*' to '${NEW_PREFIX}.*' prefix. Details: ${JSON.stringify(
          migrated_keys_info
        )}`
      })
      vscode.window.showInformationMessage(
        `Code Web Chat: ${migrated_settings_count} settings were migrated from the old 'geminiCoder' prefix to 'codeWebChat'. Your settings remain preserved.`
      )
    }

    // Mark migration as completed
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_settings_prefix',
      message: `Error migrating settings from '${OLD_PREFIX}' to '${NEW_PREFIX}' prefix`,
      data: error instanceof Error ? error.message : String(error)
    })
    vscode.window.showErrorMessage(
      `Code Web Chat: An error occurred while migrating settings. Please check the logs. You may need to manually update settings from '${OLD_PREFIX}.*' to '${NEW_PREFIX}.*'.`
    )
  }
}
