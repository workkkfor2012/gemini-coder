const ai_studio_url =
  'https://aistudio.google.com/app/prompts/new_chat#gemini-coder'
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

const is_open_webui =
  document.title.includes('Open WebUI') &&
  window.location.href.endsWith('#gemini-coder')

export const get_input_element = () => {
  const chatbot_selectors = {
    [ai_studio_url]: 'footer textarea',
    [gemini_url]: 'div[contenteditable="true"]',
    [chatgpt_url]: 'div#prompt-textarea',
    [claude_url]: 'div[contenteditable=true]',
    [github_copilot_url]: 'textarea#copilot-chat-textarea',
    [deepseek_url]: 'textarea'
  } as any
  const selector = chatbot_selectors[window.location.href]
  const active_element = selector
    ? (document.querySelector(selector) as HTMLElement)
    : (document.activeElement as HTMLElement)
  return active_element
}

const fill_input_and_send = async (
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

const set_temperature = async (temperature: string) => {
  const temperature_selector = 'ms-prompt-run-settings input[type=number]'
  const temperature_element = document.querySelector(
    temperature_selector
  ) as HTMLInputElement
  temperature_element.value = temperature
  temperature_element.dispatchEvent(new Event('input', { bubbles: true }))
  temperature_element.dispatchEvent(new Event('change', { bubbles: true }))
}

const set_model = async (model: string) => {
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

const process_clipboard_text = (
  text: string
): {
  system_instructions: string
  temperature: string
  model: string
  text: string
} => {
  let system_instructions = ''
  let model = ''
  let temperature = ''
  const files_index = text.indexOf('<files>')

  // Extract <system> if present and before <files>
  const system_match = text.match(/<system>([\s\S]*?)<\/system>/)
  if (system_match) {
    const system_index = text.indexOf(system_match[0])
    if (files_index == -1 || system_index < files_index) {
      system_instructions = system_match[1]
      text = text.replace(/<system>[\s\S]*?<\/system>/, '').trim()
    }
  }

  // Extract <temperature> if present and before <files>
  const temperature_match = text.match(/<temperature>([\s\S]*?)<\/temperature>/)
  if (temperature_match) {
    const temperature_index = text.indexOf(temperature_match[0])
    if (files_index == -1 || temperature_index < files_index) {
      temperature = temperature_match[1]
      text = text.replace(/<temperature>[\s\S]*?<\/temperature>/, '').trim()
    }
  }

  // Extract <model> if present and before <files>
  const model_match = text.match(/<model>([\s\S]*?)<\/model>/)
  if (model_match) {
    const model_index = text.indexOf(model_match[0])
    if (files_index == -1 || model_index < files_index) {
      model = model_match[1]
      text = text.replace(/<model>[\s\S]*?<\/model>/, '').trim()
    }
  }

  return { system_instructions, temperature, model, text }
}

const apply_settings_and_fill = async (params: {
  system_instructions: string
  model: string
  temperature: string
  text: string
}) => {
  if (is_ai_studio) {
    if (params.system_instructions) {
      await enter_system_instructions(params.system_instructions)
    }

    if (params.model) {
      await set_model(params.model)
    }

    if (params.temperature) {
      await set_temperature(params.temperature)
    }
  }
  fill_input_and_send(get_input_element(), params.text)
}

const handle_firefox = async (r: any) => {
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
    button.style.display = 'none'
    try {
      const original_text = await navigator.clipboard.readText()
      const processed = process_clipboard_text(original_text)
      await navigator.clipboard.writeText(processed.text)
      await apply_settings_and_fill({
        system_instructions: processed.system_instructions,
        temperature: processed.temperature,
        model: processed.model,
        text: processed.text
      })
      r(null)
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err)
    }
  }
  button.addEventListener('click', handle_paste_on_click)

  // Quirks mitigation and button placement - ordered according to URL listing
  if (is_ai_studio) {
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
    document.querySelector(button_holder)?.prepend(button)
  } else if (is_gemini) {
    const button_holder = 'zero-state-v2'
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
    document.querySelector(button_holder)?.prepend(button)
  } else if (is_chatgpt) {
    const model_selector =
      'button[data-testid="model-switcher-dropdown-button"]'
    await new Promise(async (resolve) => {
      while (!document.querySelector(model_selector)) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 100)
        })
      }
      resolve(null)
    })
    document.querySelector('form')?.appendChild(button)
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
    const button_holder = 'main > div:nth-child(2)'
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
    document.querySelector(button_holder)?.prepend(button)
  } else if (is_github_copilot) {
    const container_selector =
      '.LegalDisclaimer-module__legalTextImmersive--l5tBL'
    await new Promise(async (resolve) => {
      while (!document.querySelector(container_selector)) {
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve(true)
          }, 100)
        })
      }
      resolve(null)
    })
    document
      .querySelector(container_selector)
      ?.parentElement?.appendChild(button)
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
  }
}

const handle_chrome = async () => {
  let should_wait_additional_time = true // When window was out of focus it is probably fully loaded when once manually focused, no need to wait more
  while (!document.hasFocus()) {
    should_wait_additional_time = false
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const original_text = await navigator.clipboard.readText()
  const processed = process_clipboard_text(original_text)
  await navigator.clipboard.writeText(processed.text)

  // Quirks mitigation - ordered according to URL listing
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
      while (
        !document.querySelector(
          'button[data-testid="model-switcher-dropdown-button"]'
        )
      ) {
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
    const reason_button = document.querySelector('button[aria-label="Reason"]')
    ;(reason_button as HTMLButtonElement)?.click()
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
  }

  await apply_settings_and_fill({
    system_instructions: processed.system_instructions,
    temperature: processed.temperature,
    model: processed.model,
    text: processed.text
  })
}

const main = async () => {
  if (window.location.hash != '#gemini-coder') return

  if (navigator.userAgent.includes('Firefox')) {
    await new Promise((r) => handle_firefox(r))
  } else {
    await handle_chrome()
  }

  window.history.replaceState(
    null,
    '',
    window.location.href.replace('#gemini-coder', '')
  )
}

main()
