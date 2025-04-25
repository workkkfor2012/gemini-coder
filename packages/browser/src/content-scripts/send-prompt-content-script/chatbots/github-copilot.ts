import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'

export const github_copilot: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_model_selector = () => {
        const model_button = Array.from(
          document.querySelectorAll('button')
        ).find((button) => {
          const button_text = button.textContent?.trim() || ''
          return button_text.startsWith('Model:')
        })

        if (model_button) {
          resolve(null)
        } else {
          setTimeout(check_for_model_selector, 100)
        }
      }
      check_for_model_selector()
    })
  },
  set_model: async (model: string) => {
    if (model && model in CHATBOTS['GitHub Copilot'].models) {
      const model_selector_trigger = document.querySelector(
        'button[aria-label="Switch model"]'
      ) as HTMLButtonElement
      model_selector_trigger.click()

      await new Promise((r) => requestAnimationFrame(r))

      // Find all model option elements
      const model_options = Array.from(
        document.querySelectorAll('li[role="menuitemradio"]')
      )

      // Find the option with the matching text
      for (const option of model_options) {
        const label_element = option.querySelector('[class*="ItemLabel"]')
        if (
          label_element &&
          label_element.textContent ==
            (CHATBOTS['GitHub Copilot'].models as any)[model]
        ) {
          ;(option as HTMLElement).click()
          await new Promise((r) => requestAnimationFrame(r))
          break
        }
      }
    } else if (model) {
      alert(`Model "${model}" is no longer supported.`)
    }
  }
}
