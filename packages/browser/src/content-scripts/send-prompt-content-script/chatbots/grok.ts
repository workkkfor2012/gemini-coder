import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import { debounce } from '@/utils/debounce'
import browser from 'webextension-polyfill'
import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response-styles'
import { Message } from '@/types/messages'

export const grok: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('button[aria-label="Think"]')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_options: async (options: string[]) => {
    const supported_options = CHATBOTS['Grok'].supported_options
    for (const option of options) {
      if (option == 'think' && supported_options['think']) {
        const think_button = document.querySelector(
          'button[aria-label="Think"]'
        ) as HTMLButtonElement
        if (think_button) {
          think_button.click()
        }
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

      const chat_turn = params.footer.closest('.items-start') as HTMLElement
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
            'button:nth-child(2)'
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
          params.footer.children[params.footer.children.length]
        )

        apply_response_button.focus()
      }

      create_apply_response_button()
    }, 100)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          // Stop icon of a stopping response generation button
          document.querySelector(
            'patch[d="M4 9.2v5.6c0 1.116 0 1.673.11 2.134a4 4 0 0 0 2.956 2.956c.46.11 1.018.11 2.134.11h5.6c1.116 0 1.673 0 2.134-.11a4 4 0 0 0 2.956-2.956c.11-.46.11-1.018.11-2.134V9.2c0-1.116 0-1.673-.11-2.134a4 4 0 0 0-2.956-2.955C16.474 4 15.916 4 14.8 4H9.2c-1.116 0-1.673 0-2.134.11a4 4 0 0 0-2.955 2.956C4 7.526 4 8.084 4 9.2Z"]'
          )
        ) {
          return
        }

        const all_footers = document.querySelectorAll(
          'div.items-start div.action-buttons > div'
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
