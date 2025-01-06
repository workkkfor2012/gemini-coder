const CLIPBOARD_VALUE_PREFIX = 'gemini-coder:'

const main = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text.startsWith(CLIPBOARD_VALUE_PREFIX)) {
      const prompt = text.substring(CLIPBOARD_VALUE_PREFIX.length)
      await navigator.clipboard.writeText('')

      const is_ai_studio =
        window.location.href ==
        'https://aistudio.google.com/app/prompts/new_chat'

      // Quirks mitigaion
      if (is_ai_studio) {
        await new Promise(async (resolve) => {
          while (document.querySelector('div.counting-tokens')) {
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve(true)
              }, 100)
            })
          }
          resolve(null)
        })
      }

      const input_element = document.activeElement as
        | HTMLInputElement
        | HTMLTextAreaElement
      if (input_element && input_element.isContentEditable) {
        // Handle contenteditable element
        input_element.innerText = prompt

        // Dispatch input and change events
        input_element.dispatchEvent(new Event('input', { bubbles: true }))
        input_element.dispatchEvent(new Event('change', { bubbles: true }))

        const form = input_element.closest('form')

        if (form) {
          requestAnimationFrame(() => {
            form.requestSubmit()
          })
        } else {
          const enter_event = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          })
          input_element.dispatchEvent(enter_event)
        }
      } else if (input_element && input_element.tagName == 'TEXTAREA') {
        // Handle input or textarea element
        ;(input_element as HTMLTextAreaElement).value = prompt

        // Dispatch input and change events
        input_element.dispatchEvent(new Event('input', { bubbles: true }))
        input_element.dispatchEvent(new Event('change', { bubbles: true }))

        const form = input_element.closest('form')
        if (form) {
          requestAnimationFrame(() => {
            form.requestSubmit()
          })
        } else if (is_ai_studio) {
          requestAnimationFrame(() => {
            ;(
              document.querySelector('run-button > button') as HTMLElement
            )?.click()
          })
        } else {
          const enter_event = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          })
          input_element.dispatchEvent(enter_event)
        }
      }
    }
  } catch (err) {
    console.error('Failed to read clipboard contents: ', err)
  }
}

main()
