import * as vscode from 'vscode'
import axios from 'axios'
import { Provider } from '../types/provider'

export async function make_api_request(
  provider: Provider,
  body: any,
  cancel_token: any
): Promise<string | null> {
  try {
    const response = await axios.post(provider.endpointUrl, body, {
      headers: {
        Authorization: `Bearer ${provider.bearerToken}`,
        'Content-Type': 'application/json'
      },
      cancelToken: cancel_token
    })

    console.log(
      `[Gemini Coder] ${provider.name} RAW response:`,
      response.data.choices[0].message.content
    )

    let content = response.data.choices[0].message.content.trim()

    const regex = /^```(\w+)?\n([\s\S]*?)\n```$/
    const match = content.match(regex)
    if (match) {
      content = match[2]
    }

    return content
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log('Request canceled:', error.message)
      return null
    } else if (axios.isAxiosError(error) && error.response?.status === 429) {
      return 'rate_limit'
    } else {
      console.error('API request failed:', error)
      vscode.window.showErrorMessage(
        `Failed to send request to ${provider.name}. Check console for details.`
      )
      return null
    }
  }
}
