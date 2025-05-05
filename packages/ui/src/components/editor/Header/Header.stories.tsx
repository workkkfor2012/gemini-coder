import { Header } from './Header'
import { useState } from 'react'

export default {
  component: Header
}

export const Default = () => {
  const [active_tab, set_active_tab] = useState<'chat' | 'tools'>('chat')

  return (
    <Header
      active_tab={active_tab}
      on_chat_tab_click={() => set_active_tab('chat')}
      on_tools_tab_click={() => set_active_tab('tools')}
    />
  )
}
