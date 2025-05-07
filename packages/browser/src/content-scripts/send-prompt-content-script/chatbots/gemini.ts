import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import { debounce } from '@/utils/debounce'
import browser from 'webextension-polyfill'
import { extract_path_from_comment } from '@shared/utils/extract-path-from-comment'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response'
import { Message } from '@/types/messages'

export const gemini: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('toolbox-drawer')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_model: async (model: string) => {
    if (model && model in CHATBOTS['Gemini'].models) {
      const model_selector_trigger = document.querySelector(
        'bard-logo + button'
      ) as HTMLButtonElement
      if (model_selector_trigger) {
        model_selector_trigger.click()
        await new Promise((r) => requestAnimationFrame(r))
        const menu_content =
          document.querySelector('.mat-mdc-menu-content') ||
          document.querySelector('mat-action-list')
        if (menu_content) {
          const model_options = Array.from(
            menu_content.querySelectorAll('button[mat-menu-item]')
          )
          for (const option of model_options) {
            const name_element = option.querySelector(
              '.title-and-description > span:first-child'
            )
            if (
              name_element &&
              name_element.textContent?.trim() ==
                (CHATBOTS['Gemini'].models as any)[model]
            ) {
              ;(option as HTMLElement).click()
              await new Promise((r) => requestAnimationFrame(r))
              break
            }
          }
        }
      }
    } else if (model) {
      alert(`Model "${model}" is no longer supported.`)
    }
  },
  set_options: async (options: string[]) => {
    const supported_options = CHATBOTS['Gemini'].supported_options
    for (const option of options) {
      if (option == 'canvas' && supported_options['canvas']) {
        const canvas_button = Array.from(
          document.querySelectorAll('button')
        ).find(
          (button) => button.textContent?.trim() == 'Canvas'
        ) as HTMLButtonElement
        if (canvas_button) {
          canvas_button.click()
        }
      }
    }
  },
  inject_apply_response_button: (client_id: number) => {
    const debounced_add_buttons = debounce((params: { footer: Element }) => {
      const apply_response_button_text = 'Apply response'

      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      const chat_turn = params.footer.closest(
        'response-container'
      ) as HTMLElement
      const code_blocks = chat_turn.querySelectorAll('code')
      let has_eligible_block = false
      for (const code_block of Array.from(code_blocks)) {
        const first_line_text = code_block?.textContent?.split('\n')[0]
        if (first_line_text && extract_path_from_comment(first_line_text)) {
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
          const parent = apply_response_button.parentElement!
          const more_button = parent.querySelector(
            'button[data-test-id="more-menu-button"]'
          ) as HTMLElement
          more_button.click()
          await new Promise((r) => requestAnimationFrame(r))
          const copy_button = document.querySelector(
            '.cdk-overlay-container button[data-test-id="copy-button"]'
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
          params.footer.children[5]
        )
      }

      create_apply_response_button()
    }, 100)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          // Stop icon of a stopping response generation button
          document.querySelector('mat-icon[data-mat-icon-name="stop"]')
        ) {
          return
        }

        const all_footers = document.querySelectorAll(
          'message-actions > div > div'
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
