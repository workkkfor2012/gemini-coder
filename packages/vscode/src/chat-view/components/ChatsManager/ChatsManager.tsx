import React, { useState, useEffect } from 'react'
import * as vscode from 'vscode'
import styles from './ChatsManager.module.scss'
import { AI_STUDIO_MODELS } from '@/constants/ai-studio-models'

interface Chat {
  name: string
  webChat: string
  model?: string
  temperature?: number
  systemInstructions?: string
}

interface Props {
  availableWebChats: string[]
  systemInstructions: string[]
  onChatsChange: (chats: Chat[]) => void
}

export const ChatsManager: React.FC<Props> = ({
  availableWebChats,
  systemInstructions,
  onChatsChange
}) => {
  const [chats, setChats] = useState<Chat[]>([])

  useEffect(() => {
    // Load saved chats from configuration
    const config = vscode.workspace.getConfiguration()
    const savedChats = config.get<Chat[]>('geminiCoder.multipleChats') || []
    setChats(savedChats)
  }, [])

  const addChat = () => {
    const newChat: Chat = {
      name: `Chat ${chats.length + 1}`,
      webChat: availableWebChats[0],
      model: AI_STUDIO_MODELS[0].name,
      temperature: 0.5
    }

    const updatedChats = [...chats, newChat]
    setChats(updatedChats)
    onChatsChange(updatedChats)
  }

  const removeChat = (index: number) => {
    const updatedChats = chats.filter((_, i) => i !== index)
    setChats(updatedChats)
    onChatsChange(updatedChats)
  }

  const updateChat = (index: number, updates: Partial<Chat>) => {
    const updatedChats = chats.map((chat, i) => {
      if (i === index) {
        return { ...chat, ...updates }
      }
      return chat
    })
    setChats(updatedChats)
    onChatsChange(updatedChats)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Chat Instances</h3>
        <button onClick={addChat}>Add Chat</button>
      </div>
      <div className={styles.chatsList}>
        {chats.map((chat, index) => (
          <div key={index} className={styles.chatItem}>
            <input
              type="text"
              value={chat.name}
              onChange={(e) => updateChat(index, { name: e.target.value })}
              placeholder="Chat name"
            />
            <select
              value={chat.webChat}
              onChange={(e) => updateChat(index, { webChat: e.target.value })}
            >
              {availableWebChats.map((webChat) => (
                <option key={webChat} value={webChat}>
                  {webChat}
                </option>
              ))}
            </select>
            {chat.webChat === 'AI Studio' && (
              <>
                <select
                  value={chat.model}
                  onChange={(e) => updateChat(index, { model: e.target.value })}
                >
                  {AI_STUDIO_MODELS.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={chat.temperature}
                  onChange={(e) =>
                    updateChat(index, {
                      temperature: parseFloat(e.target.value)
                    })
                  }
                />
                <select
                  value={chat.systemInstructions || ''}
                  onChange={(e) =>
                    updateChat(index, { systemInstructions: e.target.value })
                  }
                >
                  <option value="">No system instructions</option>
                  {systemInstructions.map((instruction) => (
                    <option key={instruction} value={instruction}>
                      {instruction}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button onClick={() => removeChat(index)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}
