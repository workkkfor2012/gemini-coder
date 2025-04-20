import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'

const API_KEY_STATE_KEY = 'geminiApiKey'

/**
 * Migrates the Gemini API key from VSCode settings to extension's global state
 * This helps keep sensitive data out of settings.json which might be synced or shared
 */
export async function migrate_gemini_api_key(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Get the current configuration
    const config = vscode.workspace.getConfiguration('geminiCoder')
    const api_key: string | undefined = config.get('apiKey')

    // Check if migration is needed
    if (!api_key) {
      return // No API key in settings, no migration needed
    }

    // Store the API key in global state
    await context.globalState.update(API_KEY_STATE_KEY, api_key)

    // Remove the API key from settings
    await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global)

    Logger.log({
      function_name: 'migrate_api_key',
      message: 'Successfully migrated Gemini API key to global state'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_api_key',
      message: 'Error migrating Gemini API key',
      data: error
    })
  }
}
