import { createContext, useContext, useState } from 'react'

type ChatContext = {
  normal_instructions: string
  set_normal_instructions: React.Dispatch<React.SetStateAction<string>>
  code_completion_suggestions: string
  set_code_completion_suggestions: React.Dispatch<React.SetStateAction<string>>
  // is_code_completions_mode: boolean
  // set_is_code_completions_mode: React.Dispatch<React.SetStateAction<boolean>>
}

const ChatContext = createContext<ChatContext>({} as ChatContext)

export const use_chat = () => useContext(ChatContext)

export const ChatProvider: React.FC<{ children: React.ReactNode }> = (
  props
) => {
  const [normal_instructions, set_normal_instructions] = useState('')
  const [code_completion_suggestions, set_code_completion_suggestions] =
    useState('')
  // const [is_code_completions_mode, set_is_code_completions_mode] =
  //   useState<boolean>(false)

  return (
    <ChatContext.Provider
      value={{
        normal_instructions,
        set_normal_instructions,
        code_completion_suggestions,
        set_code_completion_suggestions,
        // is_code_completions_mode,
        // set_is_code_completions_mode
      }}
    >
      {props.children}
    </ChatContext.Provider>
  )
}
