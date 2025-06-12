import { Chatbot } from '../types/chatbot'
import browser from 'webextension-polyfill'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response-styles'
import { Message } from '@/types/messages'
import { is_eligible_code_block } from '../utils/is-eligible-code-block'
import {
  apply_response_button_text,
  apply_response_button_title
} from '../constants/copy'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'

export const claude: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('body[style="pointer-events: auto;"]')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (params: { footer: Element }) => {
      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      show_response_ready_notification({ chatbot_name: 'Claude' })

      const chat_turn = params.footer.closest(
        'div[data-is-streaming="false"]'
      ) as HTMLElement
      const code_blocks = chat_turn.querySelectorAll('code')
      let has_eligible_block = false
      for (const code_block of Array.from(code_blocks)) {
        const first_line_text = code_block?.textContent?.split('\n')[0]
        if (first_line_text && is_eligible_code_block(first_line_text)) {
          has_eligible_block = true
          break
        }
      }
      if (!has_eligible_block) return

      const create_apply_response_button = () => {
        const apply_response_button = document.createElement('button')
        apply_response_button.textContent = apply_response_button_text
        apply_response_button.title = apply_response_button_title
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
          params.footer.children[0]
        )

        apply_response_button.focus()
      }

      create_apply_response_button()
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          document.querySelector(
            'path[d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm40-112v56a12,12,0,0,1-12,12H100a12,12,0,0,1-12-12V100a12,12,0,0,1,12-12h56A12,12,0,0,1,168,100Z"]'
          )
        ) {
          return
        }

        const all_footers = document.querySelectorAll(
          'div[data-is-streaming="false"] > div:nth-child(2) > div > div'
        )
        all_footers.forEach((footer) => {
          add_buttons({
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
