import browser from 'webextension-polyfill'
import { InitializeChatsMessage } from '@shared/types/websocket-messages'

const ai_studio_url =
  'https://aistudio.google.com/prompts/new_chat#gemini-coder'
const is_ai_studio = window.location.href == ai_studio_url

const gemini_url = 'https://gemini.google.com/app#gemini-coder'
const is_gemini = window.location.href == gemini_url

const chatgpt_url = 'https://chatgpt.com/#gemini-coder'
const is_chatgpt = window.location.href == chatgpt_url

const claude_url = 'https://claude.ai/new#gemini-coder'
const is_claude = window.location.href == claude_url

const github_copilot_url = 'https://github.com/copilot#gemini-coder'
const is_github_copilot = window.location.href == github_copilot_url

const deepseek_url = 'https://chat.deepseek.com/#gemini-coder'
const is_deepseek = window.location.href == deepseek_url

const mistral_url = 'https://chat.mistral.ai/chat#gemini-coder'
const is_mistral = window.location.href == mistral_url

const grok_url = 'https://grok.com/#gemini-coder'
const is_grok = window.location.href == grok_url

// No need for special handling
// const huggingchat_url = 'https://huggingface.co/chat/'
// const is_huggingchat = window.location.href == huggingchat_url

const is_open_webui = document.title.includes('Open WebUI')

export const get_textarea_element = () => {
  const chatbot_selectors = {
    [ai_studio_url]: 'footer textarea',
    [gemini_url]: 'div[contenteditable="true"]',
    [chatgpt_url]: 'div#prompt-textarea',
    [claude_url]: 'div[contenteditable=true]',
    [github_copilot_url]: 'textarea#copilot-chat-textarea',
    [deepseek_url]: 'textarea',
    [mistral_url]: 'textarea'
  } as any
  const selector = chatbot_selectors[window.location.href]
  const active_element = selector
    ? (document.querySelector(selector) as HTMLElement)
    : (document.activeElement as HTMLElement)
  return active_element
}

const enter_text_and_send = async (
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
    if (is_claude) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true)
        }, 500)
      })
      ;(
        document.querySelector(
          'fieldset > div:first-child button'
        ) as HTMLElement
      ).click()
    } else if (form) {
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
    if (form && !is_github_copilot) {
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

const enter_system_instructions = async (system_instructions: string) => {
  if (is_ai_studio) {
    const system_instructions_selector =
      'textarea[aria-label="System instructions"]'
    const system_instructions_element = document.querySelector(
      system_instructions_selector
    ) as HTMLTextAreaElement
    if (system_instructions_element) {
      system_instructions_element.value = system_instructions
      system_instructions_element.dispatchEvent(
        new Event('input', { bubbles: true })
      )
      system_instructions_element.dispatchEvent(
        new Event('change', { bubbles: true })
      )
    } else {
      // click on button aria-label="Collapse all System Instructions" then proceed as above
      const collapse_button = document.querySelector(
        'button[aria-label="Collapse all System Instructions"]'
      ) as HTMLElement
      if (collapse_button) {
        collapse_button.click()
        // wait for animation frame, inline with resolve
        await new Promise((r) => requestAnimationFrame(r))

        const system_instructions_element = document.querySelector(
          system_instructions_selector
        ) as HTMLTextAreaElement
        if (system_instructions_element) {
          system_instructions_element.value = system_instructions
          system_instructions_element.dispatchEvent(
            new Event('input', { bubbles: true })
          )
          system_instructions_element.dispatchEvent(
            new Event('change', { bubbles: true })
          )
        }
      }
    }
  }
}

const set_temperature = async (temperature: number) => {
  if (is_ai_studio) {
    const temperature_selector = 'ms-prompt-run-settings input[type=number]'
    const temperature_element = document.querySelector(
      temperature_selector
    ) as HTMLInputElement
    temperature_element.value = temperature.toString()
    temperature_element.dispatchEvent(new Event('input', { bubbles: true }))
    temperature_element.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

const set_model = async (model: string) => {
  if (is_ai_studio) {
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
  }
}

const apply_settings_and_submit = async (params: {
  text: string
  system_instructions?: string
  model?: string
  temperature?: number
}) => {
  if (params.system_instructions) {
    await enter_system_instructions(params.system_instructions)
  }
  if (params.model) {
    await set_model(params.model)
  }
  if (params.temperature) {
    await set_temperature(params.temperature)
  }
  enter_text_and_send(get_textarea_element(), params.text)
}

const main = async () => {
  if (window.location.hash != '#gemini-coder') return

  history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search
  )

  const storage = await browser.storage.local.get('message')
  const message = storage.message as InitializeChatsMessage
  const current_chat = message.chats.find(
    (chat) => chat.url == document.location.href
  )!

  // Quirks mitigation
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
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 500)
    })
  } else if (is_gemini) {
    await new Promise(async (resolve) => {
      while (!document.querySelector('bard-mode-switcher')) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 100)
        })
      }
      resolve(null)
    })
  } else if (is_chatgpt) {
    await new Promise(async (resolve) => {
      while (!document.querySelector('span[data-radix-focus-guard]')) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 100)
        })
      }
      resolve(null)
    })
    const reason_button = document.querySelector('button[aria-label="Reason"]')
    ;(reason_button as HTMLButtonElement)?.click()
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 100)
    })
  } else if (is_claude) {
    await new Promise(async (resolve) => {
      while (!document.querySelector('fieldset')) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 100)
        })
      }
      resolve(null)
    })
  } else if (is_github_copilot) {
    await new Promise((resolve) => {
      const check_for_model_selector = () => {
        const model_button = Array.from(
          document.querySelectorAll('button')
        ).find((button) => {
          const button_text = button.textContent?.trim() || ''
          return button_text.startsWith('Model:')
        })

        if (model_button) {
          resolve(null)
        } else {
          setTimeout(check_for_model_selector, 100)
        }
      }
      check_for_model_selector()
    })
  } else if (is_mistral) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 500)
    })
  } else if (is_open_webui) {
    await new Promise(async (resolve) => {
      while (!document.querySelector('img[src="/static/favicon.png"]')) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 100)
        })
      }
      resolve(null)
    })
  } else if (is_deepseek) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 500)
    })
  } else if (is_grok) {
    await new Promise(async (resolve) => {
      while (!document.querySelector('textarea')) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 100)
        })
      }
      resolve(null)
    })
  }

  await apply_settings_and_submit({
    system_instructions: current_chat.system_instructions,
    temperature: current_chat.temperature,
    model: current_chat.model,
    text: message.text
  })
}

window.onload = main
