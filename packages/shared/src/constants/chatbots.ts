type Chatbot = {
  [key: string]: {
    url: string
    supports_custom_temperature?: boolean
    supports_system_instructions?: boolean
    supports_user_provided_model?: boolean
    supports_user_provided_port?: boolean
    models?: {
      [display_name: string]: string
    }
  }
}

export const CHATBOTS: Chatbot = {
  'AI Studio': {
    url: 'https://aistudio.google.com/prompts/new_chat',
    supports_custom_temperature: true,
    supports_system_instructions: true,
    models: {
      'Gemini 2.0 Flash': 'gemini-2.0-flash',
      'Gemini 2.0 Flash-Lite': 'gemini-2.0-flash-lite',
      'Gemini 2.5 Pro Preview 03-25': 'gemini-2.5-pro-preview-03-25',
      'Gemini 2.0 Flash Thinking Exp 01-21':
        'gemini-2.0-flash-thinking-exp-01-21'
    }
  },
  Gemini: {
    url: 'https://gemini.google.com/app',
    models: {
      '2.0 Flash': '2.0-flash',
      '2.0 Flash Thinking': '2.0-flash-thinking',
      '2.5 Pro': '2.5-pro'
    }
  },
  ChatGPT: {
    url: 'https://chatgpt.com/'
  },
  'GitHub Copilot': {
    url: 'https://github.com/copilot',
    models: {
      'GPT-4o': '4o',
      o1: 'o1',
      'o3-mini': 'o3-mini',
      'Claude 3.5 Sonnet': 'sonnet-3.5',
      'Claude 3.7 Sonnet': 'sonnet-3.7',
      'Claude 3.7 Sonnet Thinking': 'sonnet-3.7-thinking',
      'Gemini 2.0 Flash': 'gemini-2.0-flash'
    }
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
    url: 'http://openwebui/',
    supports_custom_temperature: true,
    supports_system_instructions: true,
    supports_user_provided_model: true,
    supports_user_provided_port: true
  }
}
