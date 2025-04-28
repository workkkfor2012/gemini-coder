import { Chatbot } from '../types/chatbot'

export const mistral: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await new Promise((resolve) => {
      const check_for_element = () => {
        const element = document.querySelector('main div[style*="opacity: 0;"]')
        if (!element) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  }
}
