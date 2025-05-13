import * as vscode from 'vscode'
import {
  GEMINI_API_KEY_STATE_KEY,
  OPEN_ROUTER_API_KEY_STATE_KEY
} from '@/constants/state-keys'
import { ApiToolSettings, Provider } from '@shared/types/api-tool-settings'

export class ApiToolsSettingsManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public provider_to_connection_details(provider: Provider): {
    endpoint_url: string
    api_key: string
  } {
    if (provider == 'Gemini API') {
      return {
        endpoint_url: 'https://generativelanguage.googleapis.com/v1beta',
        api_key: this.get_gemini_api_key()
      }
    } else if (provider == 'OpenRouter') {
      return {
        endpoint_url: 'https://openrouter.ai/api/v1',
        api_key: this.get_open_router_api_key()
      }
    } else {
      throw new Error('Unknown provider')
    }
  }

  get_gemini_api_key(): string {
    return this.context.globalState.get<string>(GEMINI_API_KEY_STATE_KEY, '')
  }
  get_open_router_api_key(): string {
    return this.context.globalState.get<string>(
      OPEN_ROUTER_API_KEY_STATE_KEY,
      ''
    )
  }

  async set_gemini_api_key(apiKey: string): Promise<void> {
    await this.context.globalState.update(GEMINI_API_KEY_STATE_KEY, apiKey)
  }
  async set_open_router_api_key(apiKey: string): Promise<void> {
    await this.context.globalState.update(OPEN_ROUTER_API_KEY_STATE_KEY, apiKey)
  }

  GET_TOOL_CODE_COMPLETIONS_SETTINGS(): ApiToolSettings {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings = config.get<ApiToolSettings>(
      'apiToolCodeCompletionsSettings',
      {} as ApiToolSettings
    )
    return {
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature
    }
  }

  GET_TOOL_FILE_REFACTORING_SETTINGS(): ApiToolSettings {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings = config.get<ApiToolSettings>(
      'apiToolFileRefactoringSettings',
      {} as ApiToolSettings
    )
    return {
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature
    }
  }

  GET_TOOL_COMMIT_MESSAGES_SETTINGS(): ApiToolSettings {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings = config.get<ApiToolSettings>(
      'apiToolCommitMessageSettings',
      {} as ApiToolSettings
    )
    return {
      provider: settings.provider,
      model: settings.model,
      temperature: settings.temperature
    }
  }

  // Set settings (moving from view provider)
  async set_code_completions_settings(settings: ApiToolSettings) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    await config.update(
      'apiToolCodeCompletionsSettings',
      settings,
      vscode.ConfigurationTarget.Global
    )
  }

  async set_file_refactoring_settings(settings: ApiToolSettings) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    await config.update(
      'apiToolFileRefactoringSettings',
      settings,
      vscode.ConfigurationTarget.Global
    )
  }

  async set_commit_messages_settings(settings: ApiToolSettings) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    await config.update(
      'apiToolCommitMessageSettings',
      settings,
      vscode.ConfigurationTarget.Global
    )
  }
}
