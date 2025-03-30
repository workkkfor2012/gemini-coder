import browser from 'webextension-polyfill'

// Function to add a button to message footers
const add_button_to_message_footer = (params: {
  footer: Element
  client_id: number
}) => {
  // Check if button already exists to avoid duplicates
  if (params.footer.querySelector('.fast-replace-button')) return

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

  // Create button element
  const button = document.createElement('button')
  button.className = 'fast-replace-button'
  button.textContent = 'Apply changes with fast replace'
  button.title =
    'Replaces original files in the editor. Suitable if generated in the "whole" format. Action can be reverted from a dialog in the editor\'s notifications area.'
  button.style.fontSize = '13px'
  button.style.marginLeft = '8px'
  button.style.padding = '4px 9px'
  button.style.borderRadius = '4px'
  button.style.color = 'white'
  button.style.background =
    'linear-gradient(to bottom right, #9168C0 12%, #319749 40%, #42de67 90%)'
  button.style.border = 'none'
  button.style.cursor = 'pointer'

  // Add event listener for button click
  button.addEventListener('click', () => {
    // Disable the button immediately to prevent multiple clicks
    button.disabled = true
    button.style.opacity = '0.5'
    button.style.cursor = 'pointer'
    button.textContent = 'Changes have been applied'

    // Find the parent chat-turn-container
    const chat_turn_container = params.footer.closest('.chat-turn-container')
    if (chat_turn_container) {
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
            action: 'invoke-fast-replace',
            client_id: params.client_id
          })
        }
      }
    }
  })

  params.footer.insertBefore(button, params.footer.children[2])
}

// Function to observe DOM for new message footers
export const inject_apply_changes_buttons = (params: {
  client_id: number
  is_ai_studio: boolean
}) => {
  if (params.is_ai_studio) {
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
            const allFooters = document.querySelectorAll('div.turn-footer')
            allFooters.forEach((footer) => {
              if (footer.textContent?.includes('thumb_up')) {
                add_button_to_message_footer({
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
