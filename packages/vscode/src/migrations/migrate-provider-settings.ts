import * as vscode from 'vscode'
import * as logger from '../helpers/logger'

interface ProviderConfig {
  name: string
  endpointUrl: string
  bearerToken?: string // Old property name
  apiKey?: string // New property name
  model: string
  temperature?: number
  systemInstructions?: string
  instruction?: string
}

/**
 * Migrates provider settings from 'bearerToken' to 'apiKey'
 * This helps users transition smoothly to the new configuration format.
 */
export async function migrate_provider_settings(): Promise<void> {
  try {
    // Get the current configuration
    const config = vscode.workspace.getConfiguration('geminiCoder')
    const providers: ProviderConfig[] = config.get('providers') || []

    // Check if migration is needed
    const needs_migration = providers.some(
      (provider) =>
        provider.bearerToken !== undefined && provider.apiKey === undefined
    )

    if (!needs_migration) {
      return // No migration needed
    }

    // Migrate each provider that has bearerToken but no apiKey
    const migrated_providers = providers.map((provider) => {
      if (provider.bearerToken !== undefined && provider.apiKey === undefined) {
        const updated_provider = {
          ...provider,
          apiKey: provider.bearerToken
        }

        delete updated_provider.bearerToken

        return updated_provider
      }
      return provider
    })

    // Update the configuration with the migrated providers
    await config.update(
      'providers',
      migrated_providers,
      vscode.ConfigurationTarget.Global
    )

    logger.log({
      function_name: 'migrate_provider_settings',
      message: 'Successfully migrated provider settings'
    })
  } catch (error) {
    logger.error({
      function_name: 'migrate_provider_settings',
      message: 'Error migrating provider settings',
      data: error
    })
  }
}
