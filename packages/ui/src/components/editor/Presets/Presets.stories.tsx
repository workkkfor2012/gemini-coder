import { useState } from 'react'
import { Presets } from './Presets'
import { CHATBOTS } from '@shared/constants/chatbots'

export default {
  component: Presets
}

const presets: Presets.Preset[] = [
  {
    name: 'Gemini with Flash 2.0',
    chatbot: 'Gemini' as keyof typeof CHATBOTS,
    has_affixes: true
  },
  {
    name: 'Code review with AI Studio',
    chatbot: 'AI Studio' as keyof typeof CHATBOTS,
    has_affixes: false
  }
]

export const Multiple = () => {
  const [selected_presets, set_selected_presets] = useState<string[]>([])

  return (
    <Presets
      presets={presets}
      on_preset_click={(name) => {
        console.log('on_preset_click', name)
        set_selected_presets([name])
      }}
      disabled={false}
      selected_presets={selected_presets}
      on_preset_delete={(name) => console.log('on_preset_delete', name)}
      on_preset_edit={(name) => console.log('on_preset_edit', name)}
      on_preset_duplicate={(name) => console.log('on_preset_duplicate', name)}
      on_create_preset={() => console.log('on_create_preset')}
      is_code_completions_mode={false}
      on_preset_copy={(name) => console.log('on_preset_copy', name)}
      on_presets_reorder={(reordered) =>
        console.log('on_presets_reorder', reordered)
      }
      on_set_default={() => console.log('on_set_default')}
    />
  )
}
