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

export const qwen: Chatbot = {
  wait_until_ready: async () => {
    const start_timestamp = Date.now()
    // Wait for model selector to be ready (includes one of the available models)
    await new Promise((resolve) => {
      const check_for_element = () => {
        const model_selector_button = document.querySelector(
          'button#model-selector-0-button'
        ) as HTMLElement

        if (
          Date.now() - start_timestamp > 3000 ||
          (model_selector_button &&
            model_selector_button.textContent &&
            Object.values(CHATBOTS['Qwen'].models).includes(
              model_selector_button.textContent.trim()
            ))
        ) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_model: async (model: string) => {
    const model_selector_button = document.querySelector(
      'button#model-selector-0-button'
    ) as HTMLElement

    // The model is already selected
    if (
      model_selector_button.textContent?.trim() ==
      (CHATBOTS['Qwen'].models as any)[model]
    ) {
      return
    }

    model_selector_button.click()
    if (window.innerWidth >= 768) {
      await new Promise((r) => requestAnimationFrame(r))
    } else {
      // Opening drawer...
      await new Promise((r) => setTimeout(r, 500))
    }
    const model_buttons = document.querySelectorAll(
      'div[aria-labelledby="model-selector-0-button"] button[aria-label="model-item"]'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(model_buttons)) {
      const model_name_element = (button.querySelector('div.text-sm') ||
        button.querySelector('div.text-15')) as HTMLDivElement
      if (
        model_name_element.textContent ==
        (CHATBOTS['Qwen'].models as any)[model]
      ) {
        button.click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (options: string[]) => {
    // Make sure thinking is not selected
    const buttons = document.querySelectorAll(
      '.chat-message-input button.chat-input-feature-btn'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(buttons)) {
      if (button.querySelector('i.icon-line-deepthink-01')) {
        // if button has class name active, click it
        if (button.classList.contains('active')) {
          button.click()
        }
      }
    }
    // Now check click any feature requested
    const supported_options = CHATBOTS['Qwen'].supported_options
    for (const option of options) {
      if (option == 'thinking' && supported_options['thinking']) {
        const buttons = document.querySelectorAll(
          '.chat-message-input button.chat-input-feature-btn'
        ) as NodeListOf<HTMLButtonElement>
        for (const button of Array.from(buttons)) {
          if (button.querySelector('i.icon-line-deepthink-01')) {
            button.click()
          }
        }
      }
    }
  },
  enter_message_and_send: async (message: string) => {
    let instructions = message
    if (message.includes('<files>')) {
      instructions = message.split('<files>')[0].trim()
      const context = message.split('<files>')[1].split('</files>')[0].trim()

      // Upload file
      const file_input = document.querySelector(
        'input#filesUpload'
      ) as HTMLInputElement
      const blob = new Blob([context], { type: 'text/plain' })
      const file = new File([blob], 'context.txt', { type: 'text/plain' })
      const data_transfer = new DataTransfer()
      data_transfer.items.add(file)
      file_input.files = data_transfer.files
      file_input.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((resolve) => {
        const check_for_element = () => {
          if (
            !document.querySelector(
              '.chat-message-input path[d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"]'
            )
          ) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        }
        check_for_element()
      })
    }

    // Enter instructions
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    input_element.value = instructions
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))

    // Submit
    const submit_button = document.querySelector(
      'button#send-message-button'
    ) as HTMLButtonElement
    submit_button.click()
  },
  inject_apply_response_button: (client_id: number) => {
    const debounced_add_buttons = debounce((params: { footer: Element }) => {
      const apply_response_button_text = 'Apply response with CWC'

      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      const chat_turn =
        params.footer.parentElement?.parentElement?.querySelector(
          '#response-content-container'
        ) as HTMLElement
      const code_blocks = chat_turn.querySelectorAll('.cm-content')
      let has_eligible_block = false
      for (const code_block of Array.from(code_blocks)) {
        const first_line_text =
          code_block?.querySelector('.cm-line')?.textContent
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
        apply_response_button.style.order = '7'
        apply_chat_response_button_style(apply_response_button)

        apply_response_button.addEventListener('click', async () => {
          set_button_disabled_state(apply_response_button)
          const copy_button = params.footer.querySelector(
            'button.copy-response-button'
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
      }

      create_apply_response_button()
    }, 100)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          // Stop icon of a stopping response generation button
          document.querySelector('i.icon-StopIcon')
        ) {
          return
        }

        const all_footers = document.querySelectorAll('.message-footer-buttons')
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
