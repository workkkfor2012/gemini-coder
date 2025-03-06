type Chatbot = {
  [key: string]: {
    url: string
    supports_custom_temperature?: boolean
    supports_system_instructions?: boolean
    models?: string[]
  }
}

export const CHATBOTS: Chatbot = {
  'AI Studio': {
    url: 'https://aistudio.google.com/prompts/new_chat',
    supports_custom_temperature: true,
    supports_system_instructions: true,
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite']
  },
  Gemini: {
    url: 'https://gemini.google.com/app'
  },
  ChatGPT: {
    url: 'https://chatgpt.com/'
  },
  'GitHub Copilot': {
    url: 'https://github.com/copilot',
    models: [
      'gpt-4o',
      'o1',
      'o3-mini',
      'sonnet-3.5',
      'sonnet-3.7',
      'sonnet-3.7-thinking',
      'gemini-2.0-flash'
    ]
  },
  Claude: {
    url: 'https://claude.ai/new'
  },
  DeepSeek: {
    url: 'https://chat.deepseek.com/'
  },
  Mistral: {
    url: 'https://chat.mistral.ai/chat'
  },
  Grok: {
    url: 'https://grok.com/'
  },
  HuggingChat: {
    url: 'https://huggingface.co/chat/'
  },
  'Open WebUI': {
    url: 'http://openwebui/'
  }
}
