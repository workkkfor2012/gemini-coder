import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import { debounce } from '@/utils/debounce'
import browser from 'webextension-polyfill'
import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response-styles'
import { Message } from '@/types/messages'

export const chatgpt: Chatbot = {
  wait_until_ready: async () => {
    const max_wait_time = 2000
    const start_time = Date.now()

    await new Promise((resolve) => {
      const check_for_element = () => {
        if (
          document.querySelector(
            'span[data-testid="blocking-initial-modals-done"]'
          )
        ) {
          resolve(null)
        } else if (Date.now() - start_time >= max_wait_time) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_options: async (options: string[]) => {
    const supported_options = CHATBOTS['ChatGPT'].supported_options
    for (const option of options) {
      if (option == 'temporary' && supported_options['temporary']) {
        const buttons = document.querySelectorAll('button')
        for (const item of Array.from(buttons)) {
          const path_element = item.querySelector(
            'path[d="M6.319 1.334a.667.667 0 0 1-.512.792 5.43 5.43 0 0 0-2.602 1.362.667.667 0 1 1-.918-.967A6.76 6.76 0 0 1 5.527.822a.667.667 0 0 1 .792.512m1.363 0a.667.667 0 0 1 .791-.512 6.76 6.76 0 0 1 3.24 1.699.667.667 0 1 1-.917.967 5.43 5.43 0 0 0-2.602-1.362.667.667 0 0 1-.512-.792M1.51 4.614c.348.12.533.5.413.848a4.7 4.7 0 0 0 0 3.076.667.667 0 0 1-1.26.435 6.04 6.04 0 0 1 0-3.945.666.666 0 0 1 .847-.413m10.979 0a.667.667 0 0 1 .847.414A6 6 0 0 1 13.667 7a6 6 0 0 1-.33 1.973.667.667 0 1 1-1.26-.435 4.7 4.7 0 0 0 0-3.076.667.667 0 0 1 .413-.847M2.27 10.352a.667.667 0 0 1 .479.812q-.052.2-.111.397.629-.097 1.228-.267a.67.67 0 0 1 .496.054c.445.238.93.417 1.445.528a.667.667 0 1 1-.28 1.303 7 7 0 0 1-1.553-.533c-.73.189-1.479.305-2.266.354a.667.667 0 0 1-.664-.905c.164-.425.305-.844.414-1.264a.667.667 0 0 1 .812-.48m9.468.186a.666.666 0 0 1-.024.942 6.76 6.76 0 0 1-3.24 1.7.667.667 0 0 1-.28-1.304 5.43 5.43 0 0 0 2.601-1.362.667.667 0 0 1 .943.024"]'
          )
          if (path_element) {
            ;(item as HTMLElement).click()
            break
          }
        }
        await new Promise((resolve) => {
          const check_for_param = () => {
            if (window.location.search.includes('temporary-chat=true')) {
              resolve(null)
            } else {
              setTimeout(check_for_param, 100)
            }
          }
          check_for_param()
        })
      }
    }
  },
  inject_apply_response_button: (client_id: number) => {
    const debounced_add_buttons = debounce((params: { footer: Element }) => {
      const apply_response_button_text = 'Apply response with CWC'

      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      const chat_turn = params.footer.closest('.agent-turn') as HTMLElement
      const code_blocks = chat_turn.querySelectorAll('code')
      let has_eligible_block = false
      for (const code_block of Array.from(code_blocks)) {
        const first_line_text = code_block?.textContent?.split('\n')[0]
        if (
          first_line_text &&
          extract_path_from_line_of_code(first_line_text)
        ) {
          has_eligible_block = true
          break
        }
      }
      if (!has_eligible_block) return

      const create_apply_response_button = () => {
        const apply_response_button = document.createElement('button')
        apply_response_button.textContent = apply_response_button_text
        apply_response_button.title =
          'Integrate changes with the codebase. You can fully revert this operation.'
        apply_chat_response_button_style(apply_response_button)

        apply_response_button.addEventListener('click', async () => {
          set_button_disabled_state(apply_response_button)
          const copy_button = params.footer.querySelector(
            'button[data-testid="copy-turn-action-button"]'
          ) as HTMLElement
          copy_button.click()
          await new Promise((resolve) => setTimeout(resolve, 500))
          browser.runtime.sendMessage<Message>({
            action: 'apply-chat-response',
            client_id
          })
        })

        params.footer.insertBefore(
          apply_response_button,
          params.footer.children[params.footer.children.length - 1]
        )
      }

      create_apply_response_button()
    }, 100)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          // Stop icon of a stopping response generation button
          document.querySelector('button[data-testid="stop-button"]')
        ) {
          return
        }

        const all_footers = document.querySelectorAll(
          '.agent-turn > div > div:nth-of-type(2) > div'
        )
        all_footers.forEach((footer) => {
          debounced_add_buttons({
            footer
          })
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    })
  }
}
