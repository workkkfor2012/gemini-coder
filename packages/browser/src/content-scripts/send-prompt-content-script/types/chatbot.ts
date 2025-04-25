export type Chatbot = {
  wait_until_ready?: () => Promise<void>
  set_options?: (options: string[]) => Promise<void>
  set_model?: (model: string) => Promise<void>
  set_temperature?: (temperature: number) => Promise<void>
  enter_system_instructions?: (instructions: string) => Promise<void>
}
