export type Provider = 'Gemini API' | 'OpenRouter'

export type ToolSettings = {
  provider?: Provider
  model?: string
  temperature?: number
}
