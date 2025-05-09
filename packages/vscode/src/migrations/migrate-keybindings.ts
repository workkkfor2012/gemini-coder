import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '../helpers/logger'

const OLD_PREFIX = 'geminiCoder'
const NEW_PREFIX = 'codeWebChat'
const MIGRATION_ID = 'keybindings-migration-090525'

/**
 * Migration to rename all keybindings from 'geminiCoder.*' to 'codeWebChat.*'
 * in the user's keybindings.json file.
 * This migration runs only once per extension installation.
 */
export async function migrate_keybindings(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Check if migration has already run
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.log({
        function_name: 'migrate_keybindings',
        message: 'Keybindings migration already completed. Skipping.'
      })
      return
    }

    // Get keybindings file path
    const userConfigPath = path.join(
      process.env.APPDATA || process.env.HOME || '',
      process.platform === 'darwin'
        ? 'Library/Application Support/Code/User/keybindings.json'
        : process.platform === 'win32'
        ? 'Code/User/keybindings.json'
        : '.config/Code/User/keybindings.json'
    )

    // Check if keybindings file exists
    if (!fs.existsSync(userConfigPath)) {
      Logger.log({
        function_name: 'migrate_keybindings',
        message: 'No keybindings.json file found. No migration needed.'
      })
      // Mark as completed since there's nothing to migrate
      await context.globalState.update(MIGRATION_ID, true)
      return
    }

    // Read keybindings file
    const keybindingsContent = fs.readFileSync(userConfigPath, 'utf8')
    let keybindings

    try {
      keybindings = JSON.parse(keybindingsContent)
    } catch (error) {
      Logger.error({
        function_name: 'migrate_keybindings',
        message: 'Error parsing keybindings.json',
        data: error instanceof Error ? error.message : String(error)
      })
      // Do NOT mark as completed here, as parsing failed.
      return
    }

    if (!Array.isArray(keybindings)) {
      Logger.error({
        function_name: 'migrate_keybindings',
        message: 'Invalid keybindings.json format. Expected an array.'
      })
      // Do NOT mark as completed here, as format is invalid.
      return
    }

    // Find keybindings with geminiCoder command
    let migratedCount = 0
    for (const binding of keybindings) {
      if (binding.command && binding.command.startsWith(`${OLD_PREFIX}.`)) {
        // Replace prefix in command
        const oldCommand = binding.command
        binding.command = oldCommand.replace(`${OLD_PREFIX}.`, `${NEW_PREFIX}.`)
        migratedCount++
      }
    }

    if (migratedCount > 0) {
      // Write updated keybindings
      fs.writeFileSync(userConfigPath, JSON.stringify(keybindings, null, 2))

      Logger.log({
        function_name: 'migrate_keybindings',
        message: `Successfully migrated ${migratedCount} keybindings from '${OLD_PREFIX}.*' to '${NEW_PREFIX}.*' prefix.`
      })
    } else {
      Logger.log({
        function_name: 'migrate_keybindings',
        message:
          'No keybindings found with geminiCoder prefix. No migration needed.'
      })
    }

    // Mark migration as completed after successful processing (even if no bindings were found)
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_keybindings',
      message: 'Error migrating keybindings',
      data: error instanceof Error ? error.message : String(error)
    })
    vscode.window.showErrorMessage(
      `Code Web Chat: An error occurred while migrating keybindings. Please check the logs.`
    )
    // Do NOT mark as completed if an error occurred during the process
  }
}
