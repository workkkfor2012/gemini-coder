import { Button } from './Button'
import { useState } from 'react'

export default {
  component: Button
}

export const Primary = () => (
  <Button on_click={() => console.log('Clicked')}>Primary Button</Button>
)

export const WithIcon = () => (
  <Button on_click={() => console.log('Clicked')} codicon="send">
    Button with Icon
  </Button>
)

export const Disabled = () => (
  <Button on_click={() => console.log('Clicked')} disabled>
    Disabled Button
  </Button>
)

export const WithQuickPick = () => {
  const [count, set_count] = useState(0)

  return (
    <Button
      on_click={() => set_count((c) => c + 1)}
      on_quick_pick_trigger_click={() => console.log('Quick pick clicked')}
      title={`Clicked ${count} times`}
    >
      Button with Quick Pick
    </Button>
  )
}
