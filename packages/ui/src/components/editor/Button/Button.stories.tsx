import { Button } from './Button'

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
