import { Provider } from '../types/provider'

export const BUILT_IN_PROVIDERS: Provider[] = [
  {
    name: 'Gemini 2.0 Flash',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    apiKey: '',
    model: 'gemini-2.0-flash'
  },
  {
    name: 'Gemini 2.0 Flash Lite',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    apiKey: '',
    model: 'gemini-2.0-flash-lite'
  },
  {
    name: 'Gemini 2.5 Flash Preview 04-17',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    apiKey: '',
    model: 'gemini-2.5-flash-preview-04-17'
  },
  {
    name: 'Gemini 2.5 Pro Experimental 03-25',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    apiKey: '',
    model: 'gemini-2.5-pro-exp-03-25'
  },
  {
    name: 'Gemini 2.5 Pro Preview 03-25 (billing required)',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    apiKey: '',
    model: 'gemini-2.5-pro-preview-03-25'
  },
  {
    name: 'Gemini 2.0 Flash Thinking Experimental 01-21',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    apiKey: '',
    model: 'gemini-2.0-flash-thinking-exp-01-21'
  }
]
