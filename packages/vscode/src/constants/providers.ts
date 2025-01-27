import { Provider } from '../types/provider'

export const BUILT_IN_PROVIDERS: Provider[] = [
  {
    name: 'Gemini Flash 1.5',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    bearerToken: '', // Placeholder, will be replaced with user's API key
    model: 'gemini-1.5-flash',
    temperature: 0, // Placeholder, will be replaced with user's setting
    instruction: ''
  },
  {
    name: 'Gemini Pro 1.5',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    bearerToken: '',
    model: 'gemini-1.5-pro',
    temperature: 0,
    instruction: ''
  },
  {
    name: 'Gemini 2.0 Flash Thinking Experimental 01-21',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    bearerToken: '',
    model: 'gemini-2.0-flash-thinking-exp-01-21',
    temperature: 0,
    instruction: ''
  },
  {
    name: 'Gemini 2.0 Flash Experimental',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    bearerToken: '',
    model: 'gemini-2.0-flash-exp',
    temperature: 0,
    instruction: ''
  },
  {
    name: 'Gemini Experimental 1206',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    bearerToken: '',
    model: 'gemini-exp-1206',
    temperature: 0,
    instruction: ''
  }
]
