import { Presets } from './Presets'

export default {
  component: Presets
}

const presets: Presets.Preset[] = [
  {
    name: 'Gemini with Flash 2.0',
    chatbot: 'Gemini',
    temperature: 0.5,
    prompt_prefix: 'Please help me with:',
    prompt_suffix: 'Be concise and accurate',
    system_instructions: 'You are a helpful assistant'
  },
  {
    name: 'Code review with ChatGPT',
    chatbot: 'ChatGPT',
    prompt_prefix: 'Review this code:',
    system_instructions: 'Focus on code quality and best practices'
  }
]

export const Multiple = () => {
  return (
    <Presets
      presets={presets}
    />
  )
}

export const Empty = () => {
  return (
    <Presets
      presets={[]}
    />
  )
}
