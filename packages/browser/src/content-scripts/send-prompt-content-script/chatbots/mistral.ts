import { Chatbot } from '../types/chatbot'

export const mistral: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 500)
    })
  }
}
