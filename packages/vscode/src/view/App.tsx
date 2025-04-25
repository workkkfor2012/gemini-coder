import ReactDOM from 'react-dom/client'
import { View } from './View'
import { ChatProvider } from './providers/chat-provider'

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/global.scss'

const App = () => {
  return (
    <ChatProvider>
      <View />
    </ChatProvider>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
