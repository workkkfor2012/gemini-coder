import { Chatbot } from '../types/chatbot'
import { ApplyChatResponseMessage } from '@/types/messages'
import { debounce } from '@/utils/debounce'
import { extract_path_from_comment } from '@shared/utils/extract-path-from-comment'
import browser from 'webextension-polyfill'

const apply_chat_response_button_style = (button: HTMLButtonElement) => {
  button.style.fontSize = '13px'
  button.style.marginLeft = '8px'
  button.style.padding = '4px 9px'
  button.style.borderRadius = '4px'
  button.style.color = 'white'
  button.style.background =
    'linear-gradient(to bottom right, #9168C0 12%, #319749 40%, #42de67 90%)'
  button.style.border = 'none'
  button.style.cursor = 'pointer'
  button.style.transition = 'opacity 0.2s ease-in-out'
}

const handle_apply_chat_response_button_click = (
  clicked_button: HTMLButtonElement,
  client_id: number
) => {
  clicked_button.disabled = true
  clicked_button.style.opacity = '50%'
  clicked_button.style.cursor = 'not-allowed'
  const chat_turn_container = clicked_button.closest('.chat-turn-container')!
  const options = chat_turn_container.querySelector(
    'ms-chat-turn-options > div > button'
  ) as HTMLElement
  options.click()
  const markdown_copy_button = Array.from(
    document.querySelectorAll('button')
  ).find((button) =>
    button.textContent?.includes('markdown_copy')
  ) as HTMLElement
  markdown_copy_button.click()
  browser.runtime.sendMessage({
    action: 'apply-chat-response',
    client_id
  } as ApplyChatResponseMessage)
}

export const ai_studio: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('.title-container')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 500)
    })
  },
  set_model: async (model: string) => {
    const model_selector_trigger = document.querySelector(
      'ms-model-selector mat-form-field > div'
    ) as HTMLElement
    model_selector_trigger.click()
    await new Promise((r) => requestAnimationFrame(r))
    const model_options = Array.from(document.querySelectorAll('mat-option'))
    for (const option of model_options) {
      const model_name_element = option.querySelector(
        'ms-model-option > div:last-child'
      ) as HTMLElement
      if (model_name_element?.textContent?.trim() == model) {
        ;(option as HTMLElement).click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  enter_system_instructions: async (system_instructions: string) => {
    const assignment_button = Array.from(
      document.querySelectorAll('ms-toolbar button')
    ).find(
      (button) => button.textContent?.trim() == 'assignment'
    ) as HTMLButtonElement
    assignment_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const system_instructions_selector =
      'textarea[aria-label="System instructions"]'
    const system_instructions_element = document.querySelector(
      system_instructions_selector
    ) as HTMLTextAreaElement
    system_instructions_element.value = system_instructions
    system_instructions_element.dispatchEvent(
      new Event('input', { bubbles: true })
    )
    system_instructions_element.dispatchEvent(
      new Event('change', { bubbles: true })
    )
    assignment_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_temperature: async (temperature: number) => {
    if (window.innerWidth <= 768) {
      const tune_button = Array.from(
        document.querySelectorAll('prompt-header button')
      ).find(
        (button) => button.textContent?.trim() == 'tune'
      ) as HTMLButtonElement
      tune_button.click()
      await new Promise((r) => requestAnimationFrame(r))
    }
    const temperature_element = document.querySelector(
      'ms-prompt-run-settings input[type=number]'
    ) as HTMLInputElement
    temperature_element.value = temperature.toString()
    temperature_element.dispatchEvent(new Event('change', { bubbles: true }))
    if (window.innerWidth <= 768) {
      const close_button = Array.from(
        document.querySelectorAll('ms-run-settings button')
      ).find(
        (button) => button.textContent?.trim() == 'close'
      ) as HTMLButtonElement
      close_button.click()
    }
  },
  inject_apply_response_button: (client_id: number) => {
    const debounced_add_buttons = debounce(
      (params: { footer: Element; client_id: number }) => {
        const apply_response_button_text = 'Apply response'

        // Check if buttons already exist by text content to avoid duplicates
        const existing_apply_response_button = Array.from(
          params.footer.querySelectorAll('button')
        ).find((btn) => btn.textContent == apply_response_button_text)

        if (existing_apply_response_button) {
          return
        }

        // Find the parent chat-turn-container
        const chat_turn = params.footer.closest('ms-chat-turn') as HTMLElement

        if (!chat_turn) {
          console.error(
            'Chat turn container not found for footer:',
            params.footer
          )
          return
        }

        const first_line_comments_of_code_blocks = chat_turn.querySelectorAll(
          'ms-code-block code > span.hljs-comment:first-child'
        )
        let has_eligible_block = false
        for (const code_block of Array.from(
          first_line_comments_of_code_blocks
        )) {
          if (
            code_block?.textContent &&
            extract_path_from_comment(code_block.textContent)
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
            'Send response to the editor. The operation can be completely rolled back.'
          apply_chat_response_button_style(apply_response_button)

          // Add event listener for Fast replace button click
          apply_response_button.addEventListener('click', () => {
            handle_apply_chat_response_button_click(
              apply_response_button,
              params.client_id
            )
          })

          params.footer.insertBefore(
            apply_response_button,
            params.footer.children[2]
          )
        }

        create_apply_response_button()
      },
      100
    )

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        const all_footers = document.querySelectorAll(
          'ms-chat-turn .turn-footer'
        )
        all_footers.forEach((footer) => {
          // Check if the footer is for an AI response (contains thumb_up icon)
          if (
            footer.querySelector('mat-icon')?.textContent?.trim() == 'thumb_up'
          ) {
            debounced_add_buttons({
              footer,
              client_id
            })
          }
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
