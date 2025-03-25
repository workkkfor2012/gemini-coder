import { Provider } from '../types/provider'

export const BUILT_IN_PROVIDERS: Provider[] = [
  {
    name: 'Gemini 2.0 Flash',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    bearerToken: '',
    model: 'gemini-2.0-flash',
    temperature: 0,
    instruction: ''
  },
  {
    name: 'Gemini 2.0 Flash Lite',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    bearerToken: '',
    model: 'gemini-2.0-flash-lite',
    temperature: 0,
    instruction: ''
  },
  {
    name: 'Gemini 2.5 Pro Experimental 03-25',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    bearerToken: '',
    model: 'gemini-2.5-pro-exp-03-25',
    temperature: 0,
    instruction: ''
  },
  {
    name: 'Gemini 2.0 Pro Experimental 02-05',
    endpointUrl:
      'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    bearerToken: '',
    model: 'gemini-2.0-pro-exp-02-05',
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
  }
]
