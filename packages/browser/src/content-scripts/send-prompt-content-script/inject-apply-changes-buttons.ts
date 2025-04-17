import browser from 'webextension-polyfill'

// Function to check if any code block contains truncated fragments
const has_truncated_fragments = (container: Element): boolean => {
  const code_blocks = container.querySelectorAll('ms-code-block')
  for (const block of Array.from(code_blocks)) {
    const code_content = block.querySelector('code')?.textContent
    if (code_content && /^\s*\/\/\s+\.\.\.\s*$/m.test(code_content)) {
      return true
    }
  }
  return false
}

// Function to check if any code block contains diff markers
const has_diff_markers = (container: Element): boolean => {
  const code_blocks = container.querySelectorAll('ms-code-block')
  for (const block of Array.from(code_blocks)) {
    const code_content = block.querySelector('code')?.textContent
    if (code_content && /^[+-]/.test(code_content)) {
      return true
    }
  }
  return false
}

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
}

// Handle button click
const handle_button_click = (
  button: HTMLButtonElement,
  client_id: number,
  action: 'fast-replace' | 'intelligent-update'
) => {
  // Find the parent chat-turn-container
  const chat_turn_container = button.closest('.chat-turn-container')
  if (!chat_turn_container) return

  // Find and disable/hide both buttons
  const buttons = chat_turn_container.querySelectorAll(
    '.fast-replace-button, .intelligent-update-button'
  )

  buttons.forEach((btn) => {
    ;(btn as HTMLButtonElement).disabled = true
    btn.setAttribute(
      'style',
      `
      cursor: not-allowed;
    `
    )
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
        action: `invoke-${action}`,
        client_id
      })
    }
  }
}

// Function to observe DOM for new message footers
export const inject_apply_changes_buttons = (params: {
  client_id: number
  is_ai_studio: boolean
}) => {
  if (params.is_ai_studio) {
    const add_buttons_to_message_footer = (params: {
      footer: Element
      client_id: number
    }) => {
      // Check if buttons already exist to avoid duplicates
      if (
        params.footer.querySelector('.fast-replace-button') ||
        params.footer.querySelector('.intelligent-update-button')
      ) {
        return
      }

      // Find the parent chat-turn-container
      const chat_turn_container = params.footer.closest('.chat-turn-container')
      if (!chat_turn_container) {
        console.warn(
          'Could not find chat-turn-container for footer:',
          params.footer
        )
        return
      }

      // Check if the container has any code block with name= attribute
      const language_spans = chat_turn_container.querySelectorAll(
        'ms-code-block footer > span.language'
      )
      let has_name_attribute = false

      language_spans.forEach((span) => {
        if (span.textContent?.includes('name=')) {
          has_name_attribute = true
        }
      })

      // Only proceed if we found at least one code block with name= attribute
      if (!has_name_attribute) return

      const has_truncated = has_truncated_fragments(chat_turn_container)
      const has_diff = has_diff_markers(chat_turn_container)

      const create_fast_replace_button = () => {
        const fast_replace_button = document.createElement('button')
        fast_replace_button.className = 'fast-replace-button'
        fast_replace_button.textContent = 'Fast replace'
        fast_replace_button.title =
          'Overrides original files. Action can be reverted.'
        apply_button_style(fast_replace_button)

        // Add event listener for Fast replace button click
        fast_replace_button.addEventListener('click', () => {
          handle_button_click(
            fast_replace_button,
            params.client_id,
            'fast-replace'
          )
        })

        params.footer.insertBefore(
          fast_replace_button,
          params.footer.children[2]
        )
      }
      const create_intelligent_update_button = () => {
        const intelligent_update_button = document.createElement('button')
        intelligent_update_button.className = 'intelligent-update-button'
        intelligent_update_button.textContent = 'Intelligent update'
        intelligent_update_button.title =
          'Uses AI to merge partial changes into existing files.'
        apply_button_style(intelligent_update_button)
        intelligent_update_button.style.background =
          'linear-gradient(to bottom right, #9168C0 12%, #319749 40%, #42de67 90%)'

        // Add event listener for Intelligent update button click
        intelligent_update_button.addEventListener('click', () => {
          handle_button_click(
            intelligent_update_button,
            params.client_id,
            'intelligent-update'
          )
        })

        params.footer.insertBefore(
          intelligent_update_button,
          params.footer.children[2]
        )
      }

      if (has_truncated || has_diff) {
        create_intelligent_update_button()
      } else {
        create_fast_replace_button()
      }
    }

    const attribute_observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type == 'attributes' &&
          (mutation.attributeName == 'disabled' ||
            mutation.attributeName == 'mattooltipclass')
        ) {
          const target = mutation.target as Element
          if (
            target.nodeName == 'BUTTON' &&
            target.getAttribute('mattooltipclass') == 'run-button-tooltip' &&
            target.hasAttribute('disabled')
          ) {
            console.log(
              'Button with required attributes found via attribute change'
            )
            // Find all footers and add buttons to them
            const all_footers = document.querySelectorAll('div.turn-footer')
            all_footers.forEach((footer) => {
              if (footer.textContent?.includes('thumb_up')) {
                add_buttons_to_message_footer({
                  footer,
                  client_id: params.client_id
                })
              }
            })
          }
        }
      })
    })

    // Start observing for attribute changes on the document.
    // We are looking at the "Run" button to become disabled
    // what means the response is generated and prompt is empty.
    attribute_observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['disabled', 'mattooltipclass'],
      subtree: true
    })
  }
}
