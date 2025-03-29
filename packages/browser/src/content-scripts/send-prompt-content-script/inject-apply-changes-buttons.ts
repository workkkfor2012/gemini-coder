// Function to add a button to message footers
const add_button_to_message_footer = (footer: Element) => {
  // Check if button already exists to avoid duplicates
  if (footer.querySelector('.fast-replace-button')) return

  // Create button element
  const button = document.createElement('button')
  button.className = 'fast-replace-button'
  button.textContent = 'Fast replace'
  button.style.marginLeft = '8px'
  button.style.padding = '4px 8px'
  button.style.borderRadius = '4px'
  button.style.backgroundColor = '#f0f0f0'
  button.style.border = '1px solid #ccc'
  button.style.cursor = 'pointer'

  // Add event listener for button click
  button.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Handle button click action
    console.log('Fast replace')
    
  })

  // Append button to the footer
  footer.appendChild(button)
}

// Function to observe DOM for new message footers
export const inject_apply_changes_buttons = (params: {
  is_ai_studio: boolean
}) => {
  if (params.is_ai_studio) {
    const attribute_observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'disabled' ||
            mutation.attributeName === 'mattooltipclass')
        ) {
          const target = mutation.target as Element
          if (
            target.nodeName === 'BUTTON' &&
            target.getAttribute('mattooltipclass') === 'run-button-tooltip' &&
            target.hasAttribute('disabled')
          ) {
            console.log(
              'Button with required attributes found via attribute change'
            )
            // Find all footers and add buttons to them
            const allFooters = document.querySelectorAll('div.turn-footer')
            allFooters.forEach((footer) => {
              if (footer.textContent?.includes('thumb_up')) {
                add_button_to_message_footer(footer)
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
