import { Chatbot } from '../types/chatbot'

export const chatgpt: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('span[data-radix-focus-guard]')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    const reason_button = document.querySelector('button[aria-label="Reason"]')
    ;(reason_button as HTMLButtonElement)?.click()
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 100)
    })
  }
}
