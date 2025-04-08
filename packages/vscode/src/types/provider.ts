export interface Provider {
  name: string
  endpointUrl: string
  apiKey: string
  model: string
  temperature?: number
  systemInstructions?: string
  options?: string[]
}
