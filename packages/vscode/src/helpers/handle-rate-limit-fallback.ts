import * as vscode from 'vscode'
import { Provider } from '../types/provider'
import { make_api_request } from './make-api-request'
import { CancelToken } from 'axios'

/**
 * Helper function to handle rate limit fallback across the application.
 * When a rate limit is hit, it allows selecting another model to retry the request.
 *
 * @param all_providers List of all available providers
 * @param default_model_name Name of the default model that hit the rate limit
 * @param body Request body to be sent with the fallback request
 * @param cancel_token Cancellation token for the request
 * @param attempted_providers Set of providers that have already been attempted
 * @returns The response from the fallback model, or null if cancelled or failed
 */
export async function handle_rate_limit_fallback(
  all_providers: Provider[],
  default_model_name: string | undefined,
  body: any,
  cancel_token: CancelToken,
  attempted_providers: Set<string> = new Set() // Add tracking of attempted providers
): Promise<string | null> {
  // Add the default model to attempted providers
  if (default_model_name) {
    attempted_providers.add(default_model_name)
  }

  // Filter out all previously attempted providers
  const available_providers = all_providers.filter(
    (p) => !attempted_providers.has(p.name)
  )

  if (available_providers.length === 0) {
    vscode.window.showErrorMessage(
      'All available models have hit their rate limits. Please try again later.'
    )
    return null
  }

  // Show quick pick with remaining available models
  const selected_provider_name = await vscode.window.showQuickPick(
    available_providers.map((p) => p.name),
    {
      placeHolder: 'Rate limit reached, retry with another model'
    }
  )

  if (!selected_provider_name) {
    vscode.window.showErrorMessage('No model selected. Request cancelled.')
    return null
  }

  // Get the selected provider and create updated request body
  const selected_provider = all_providers.find(
    (p) => p.name == selected_provider_name
  )!
  const fallback_body = {
    ...body,
    model: selected_provider.model,
    temperature: selected_provider.temperature
  }

  // Make request with the fallback provider
  const result = await make_api_request(
    selected_provider,
    fallback_body,
    cancel_token
  )

  // If we hit another rate limit, recursively try with remaining providers
  if (result == 'rate_limit') {
    attempted_providers.add(selected_provider_name)
    return handle_rate_limit_fallback(
      all_providers,
      default_model_name,
      body,
      cancel_token,
      attempted_providers
    )
  }

  return result
}
