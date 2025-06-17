import { QuickAction } from './QuickAction'

export default {
  component: QuickAction
}

export const Default = () => (
  <div style={{ width: '300px' }}>
    <QuickAction
      title="Quick Action Title"
      description="This is a short description for the quick action."
      on_click={() => console.log('Quick action clicked!')}
    />
  </div>
)

export const LongDescription = () => (
  <QuickAction
    title="Another Quick Action"
    description="This quick action has a much longer description that might wrap to multiple lines, providing more context about what this action does and why you might want to click it. It's important to be informative."
    on_click={() => console.log('Long description action clicked!')}
  />
)
