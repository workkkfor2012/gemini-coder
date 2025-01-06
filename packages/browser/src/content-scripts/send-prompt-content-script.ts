const CLIPBOARD_VALUE_PREFIX = 'gemini-coder:'

const is_ai_studio =
  window.location.href ==
  'https://aistudio.google.com/app/prompts/new_chat#gemini-coder'

const is_deepseek =
  window.location.href == 'https://chat.deepseek.com/#gemini-coder'

export const get_input_element = () => {
  const chatbot_selectors = {
    'https://aistudio.google.com/app/prompts/new_chat#gemini-coder':
      'footer textarea',
    'https://chat.deepseek.com/#gemini-coder': 'textarea'
  } as any

  const selector = chatbot_selectors[window.location.href]

  const active_element = selector
    ? (document.querySelector(selector) as HTMLElement)
    : (document.activeElement as HTMLElement)

  return active_element
}

const fill_input_and_send = (
  input_element: HTMLElement | null,
  prompt: string
) => {
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
        ;(document.querySelector('run-button > button') as HTMLElement)?.click()
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

const handle_firefox = async () => {
  const button = document.createElement('button')
  button.innerText = 'Continue from VS Code'
  button.style.margin = '20px auto'
  button.style.padding = '10px 16px'
  button.style.backgroundColor = '#4CAF50'
  button.style.color = 'white'
  button.style.border = 'none'
  button.style.borderRadius = '8px'
  button.style.cursor = 'pointer'
  button.style.fontWeight = '600'

  const handle_paste_on_click = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.startsWith(CLIPBOARD_VALUE_PREFIX)) {
        await navigator.clipboard.writeText('')
        const prompt = text.substring(CLIPBOARD_VALUE_PREFIX.length)
        const input_element = get_input_element()
        fill_input_and_send(input_element, prompt)
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err)
    }
  }
  button.addEventListener('click', handle_paste_on_click)

  if (is_ai_studio) {
    // wait until title container is found
    const button_holder = 'ms-zero-state'
    await new Promise(async (resolve) => {
      while (!document.querySelector(button_holder)) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 100)
        })
      }
      resolve(null)
    })
    // prepend on top
    document.querySelector(button_holder)?.prepend(button)
  } else if (is_deepseek) {
    const title_container_selector = '.a85a674a'
    await new Promise(async (resolve) => {
      while (!document.querySelector(title_container_selector)) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 100)
        })
      }
      resolve(null)
    })
    document.querySelector(title_container_selector)?.appendChild(button)
  } else {
    document.body.appendChild(button)
  }
}

const handle_chrome = async () => {
  let should_wait_additional_time = true // When window was out of focus it is probably fully loaded when once manually focused, no need to wait more
  while (!document.hasFocus()) {
    should_wait_additional_time = false
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const text = await navigator.clipboard.readText()
  if (text.startsWith(CLIPBOARD_VALUE_PREFIX)) {
    await navigator.clipboard.writeText('')
    const prompt = text.substring(CLIPBOARD_VALUE_PREFIX.length)
    // Quirks mitigaion
    if (is_ai_studio) {
      await new Promise(async (resolve) => {
        while (!document.querySelector('.title-container')) {
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(true)
            }, 100)
          })
        }
        resolve(null)
      })
      if (should_wait_additional_time) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 500)
        })
      }
    }

    fill_input_and_send(get_input_element(), prompt)
  }
}

const main = () => {
  if (window.location.hash != '#gemini-coder') return
  if (navigator.userAgent.includes('Firefox')) {
    handle_firefox()
  } else {
    handle_chrome()
  }
}

main()
