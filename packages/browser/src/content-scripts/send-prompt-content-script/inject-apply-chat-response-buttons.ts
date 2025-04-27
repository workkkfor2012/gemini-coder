import { ApplyChatResponseMessage } from '@/types/messages'
import { debounce } from '@/utils/debounce'
import { extract_path_from_comment } from '@shared/utils/extract-path-from-comment'
import browser from 'webextension-polyfill'

// Apply common button styles
const apply_button_style = (button: HTMLButtonElement) => {
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

// Handle button click
const handle_button_click = (
  clicked_button: HTMLButtonElement,
  client_id: number
) => {
  // Find the parent chat-turn-container
  const chat_turn_container = clicked_button.closest('.chat-turn-container')
  if (!chat_turn_container) return

  // Disable all custom buttons within this chat turn and set opacity
  const custom_buttons = chat_turn_container.querySelectorAll('button')

  custom_buttons.forEach((button) => {
    if (button.textContent == 'Apply response') {
      ;(button as HTMLButtonElement).disabled = true
      ;(button as HTMLButtonElement).style.opacity = '50%'
      ;(button as HTMLButtonElement).style.cursor = 'not-allowed'
    }
  })

  // Find the ms-chat-turn-options element within the container
  const options = chat_turn_container.querySelector(
    'ms-chat-turn-options > div > button'
  )
  if (options) {
    // Simulate a click on the ms-chat-turn-options element
    ;(options as any).click()
    const markdown_copy_button = Array.from(
      document.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('markdown_copy'))

    if (markdown_copy_button) {
      ;(markdown_copy_button as any).click()
      browser.runtime.sendMessage({
        action: 'apply-chat-response',
        client_id
      } as ApplyChatResponseMessage)
    }
  }
}

// Function to observe DOM for new message footers
export const inject_apply_response_button = (params: {
  client_id: number
  is_ai_studio: boolean
}) => {
  if (params.is_ai_studio) {
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

        // TODO Remove checking for name attribute a few weeks from 18 Apr 2025
        let has_eligible_block = false

        const language_span = chat_turn.querySelector(
          'ms-code-block footer > span.language'
        ) as HTMLSpanElement

        if (language_span?.textContent?.includes('name=')) {
          has_eligible_block = true
        }

        if (!has_eligible_block) {
          const code_block = chat_turn.querySelector(
            'ms-code-block code > span.hljs-comment:first-child'
          ) as HTMLElement
          if (
            code_block?.textContent &&
            extract_path_from_comment(code_block.textContent)
          ) {
            has_eligible_block = true
          }
        }

        // Only proceed if we found at least one code block with a name attribute or filename comment
        if (!has_eligible_block) return

        const create_apply_response_button = () => {
          const apply_response_button = document.createElement('button')
          apply_response_button.textContent = apply_response_button_text
          apply_response_button.title =
            'Send response to the editor. The operation can be completely rolled back.'
          apply_button_style(apply_response_button)

          // Add event listener for Fast replace button click
          apply_response_button.addEventListener('click', () => {
            handle_button_click(apply_response_button, params.client_id)
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
              client_id: params.client_id
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
