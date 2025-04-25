import browser from 'webextension-polyfill'
import { Chat } from '@shared/types/websocket-message'
import { inject_apply_response_button } from './inject-apply-chat-response-buttons'
import { CHATBOTS } from '@shared/constants/chatbots'
import { openrouter } from './chatbots/openrouter'
import { open_webui } from './chatbots/open-webui'
import { deepseek } from './chatbots/deepseek'
import { grok } from './chatbots/grok'
import { mistral } from './chatbots/mistral'
import { github_copilot } from './chatbots/github-copilot'
import { claude } from './chatbots/claude'
import { chatgpt } from './chatbots/chatgpt'
import { gemini } from './chatbots/gemini'
import { ai_studio } from './chatbots/ai-studio'

// In case it changes before finding textarea element (e.g. in mobile AI Studio, when changing model)
const current_url = window.location.href

// Extract batch ID from URL hash if available
const hash = window.location.hash
const hash_prefix = '#gemini-coder'
const is_gemini_coder_hash = hash.startsWith(hash_prefix)
const batch_id = is_gemini_coder_hash
  ? hash.substring(hash_prefix.length + 1) || 'default'
  : ''

const ai_studio_url = 'https://aistudio.google.com/prompts/new_chat'
const is_ai_studio = current_url.startsWith(
  'https://aistudio.google.com/prompts/new_chat'
)

const gemini_url = 'https://gemini.google.com/app'
const is_gemini = current_url.startsWith('https://gemini.google.com/app')

const openrouter_url = 'https://openrouter.ai/chat'
const is_openrouter = current_url.startsWith('https://openrouter.ai/chat')

const chatgpt_url = 'https://chatgpt.com/'
const is_chatgpt = current_url.startsWith('https://chatgpt.com/')

const claude_url = 'https://claude.ai/new'
const is_claude = current_url.startsWith('https://claude.ai/new')

const github_copilot_url = 'https://github.com/copilot'
const is_github_copilot = current_url.startsWith('https://github.com/copilot')

const deepseek_url = 'https://chat.deepseek.com/'
const is_deepseek = current_url.startsWith('https://chat.deepseek.com/')

const mistral_url = 'https://chat.mistral.ai/chat'
const is_mistral = current_url.startsWith('https://chat.mistral.ai/chat')

// const grok_url = 'https://grok.com/'
const is_grok = current_url.startsWith('https://grok.com/')

// No need for special handling
// const huggingchat_url = 'https://huggingface.co/chat/'
// const is_huggingchat = current_url == huggingchat_url

const is_open_webui = document.title.includes('Open WebUI')

export const get_textarea_element = () => {
  const chatbot_selectors = {
    [ai_studio_url]: 'textarea',
    [gemini_url]: 'div[contenteditable="true"]',
    [openrouter_url]: 'textarea',
    [chatgpt_url]: 'div#prompt-textarea',
    [claude_url]: 'div[contenteditable=true]',
    [github_copilot_url]: 'textarea#copilot-chat-textarea',
    [deepseek_url]: 'textarea',
    [mistral_url]: 'textarea'
  } as any

  // Find the appropriate selector based on the URL without the hash
  let selector = null
  for (const [url, sel] of Object.entries(chatbot_selectors)) {
    if (current_url.split('#')[0].split('?')[0].startsWith(url)) {
      selector = sel
      break
    }
  }

  const active_element = selector
    ? (document.querySelector(selector as string) as HTMLElement)
    : (document.activeElement as HTMLElement)
  return active_element
}

const enter_message_and_send = async (params: {
  input_element: HTMLElement | null
  message: string
}) => {
  if (params.input_element && params.input_element.isContentEditable) {
    params.input_element.innerText = params.message
    params.input_element.dispatchEvent(new Event('input', { bubbles: true }))
    params.input_element.dispatchEvent(new Event('change', { bubbles: true }))
    const form = params.input_element.closest('form')
    if (is_claude) {
      await new Promise((r) => setTimeout(r, 500))
      const submit_button = Array.from(
        document.querySelectorAll('fieldset button')
      ).find((button) =>
        button.querySelector(
          'path[d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"]'
        )
      ) as HTMLButtonElement
      submit_button.click()
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
      params.input_element.dispatchEvent(enter_event)
    }
  } else if (
    params.input_element &&
    params.input_element.tagName == 'TEXTAREA'
  ) {
    const form = params.input_element.closest('form')
    ;(params.input_element as HTMLTextAreaElement).value = params.message
    params.input_element.dispatchEvent(new Event('input', { bubbles: true }))
    params.input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))
    if (is_openrouter) {
      await new Promise((r) => setTimeout(r, 500))
    }
    if (form && !is_github_copilot) {
      form.requestSubmit()
    } else if (is_ai_studio) {
      ;(document.querySelector('run-button > button') as HTMLElement)?.click()
    } else {
      const enter_event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      })
      params.input_element.dispatchEvent(enter_event)
    }
  }
}

const enter_system_instructions = async (system_instructions: string) => {
  if (is_ai_studio) {
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
  } else if (is_open_webui) {
    const controls_button = document.querySelector(
      'button[aria-label="Controls"]'
    ) as HTMLButtonElement
    controls_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const controls_pane =
      window.innerWidth >= 1024
        ? (document.querySelector('[data-pane]:last-child') as HTMLElement)
        : (document.querySelector('div.modal') as HTMLElement)
    const system_instructions_textarea = controls_pane.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    system_instructions_textarea.value = system_instructions
    system_instructions_textarea.dispatchEvent(
      new Event('input', { bubbles: true })
    )
    system_instructions_textarea.dispatchEvent(
      new Event('change', { bubbles: true })
    )
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    close_button.click()
  } else if (is_openrouter) {
    const options_button = Array.from(
      document.querySelectorAll('main > div > div > div.flex-col button')
    ).find((button) => {
      const path = button.querySelector('path')
      return (
        path?.getAttribute('d') ==
        'M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z'
      )
    }) as HTMLButtonElement
    options_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const textarea = document.querySelector(
      'div[data-headlessui-portal] textarea'
    ) as HTMLTextAreaElement
    textarea.focus()
    textarea.value = system_instructions
    textarea.dispatchEvent(new Event('change', { bubbles: true }))
    textarea.blur()
    const close_button = Array.from(
      document.querySelectorAll('div[data-headlessui-portal] button')
    ).find((button) => {
      const path = button.querySelector('path')
      return (
        path?.getAttribute('d') ==
        'm9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
      )
    }) as HTMLButtonElement
    close_button.click()
  }
}

const set_temperature = async (temperature: number) => {
  if (is_ai_studio) {
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
  } else if (is_open_webui) {
    const controls_button = document.querySelector(
      'button[aria-label="Controls"]'
    ) as HTMLButtonElement
    controls_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const controls_pane =
      window.innerWidth >= 1024
        ? (document.querySelector('[data-pane]:last-child') as HTMLElement)
        : (document.querySelector('div.modal') as HTMLElement)
    const pb_safe_bottom = controls_pane.querySelector(
      '.pb-safe-bottom'
    ) as HTMLElement
    const fifth_div = pb_safe_bottom.querySelector(
      'div:nth-child(5)'
    ) as HTMLElement
    const temperature_button = fifth_div.querySelector('button') as HTMLElement
    temperature_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const temperature_input = fifth_div.querySelector(
      'input'
    ) as HTMLInputElement
    temperature_input.value = temperature.toString()
    temperature_input.dispatchEvent(new Event('change', { bubbles: true }))
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    close_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  } else if (is_openrouter) {
    const options_button = Array.from(
      document.querySelectorAll('main > div > div > div.flex-col button')
    ).find((button) => {
      const path = button.querySelector('path')
      return (
        path?.getAttribute('d') ==
        'M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z'
      )
    }) as HTMLButtonElement
    options_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const sampling_parameters_button = Array.from(
      document.querySelectorAll('div[data-headlessui-portal] button')
    ).find(
      (button) => button.textContent?.trim() == 'Sampling Parameters'
    ) as HTMLButtonElement
    sampling_parameters_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const temperature_div = Array.from(
      document.querySelectorAll(
        'div[data-headlessui-portal] div.flex.justify-between.text-sm'
      )
    ).find((div) => div.textContent?.trim() == 'Temperature') as HTMLElement
    const temperature_input = temperature_div.querySelector(
      'input'
    ) as HTMLInputElement
    temperature_input.focus()
    temperature_input.value = temperature.toString()
    temperature_input.dispatchEvent(new Event('change', { bubbles: true }))
    temperature_input.blur()
    const close_button = Array.from(
      document.querySelectorAll('div[data-headlessui-portal] button')
    ).find((button) => {
      const path = button.querySelector('path')
      return (
        path?.getAttribute('d') ==
        'm9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'
      )
    }) as HTMLButtonElement
    close_button.click()
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
    await new Promise((r) => requestAnimationFrame(r))
  } else if (is_github_copilot) {
    if (model && model in CHATBOTS['GitHub Copilot'].models) {
      const model_selector_trigger = document.querySelector(
        'button[aria-label="Switch model"]'
      ) as HTMLButtonElement
      model_selector_trigger.click()

      await new Promise((r) => requestAnimationFrame(r))

      // Find all model option elements
      const model_options = Array.from(
        document.querySelectorAll('li[role="menuitemradio"]')
      )

      // Find the option with the matching text
      for (const option of model_options) {
        const label_element = option.querySelector('[class*="ItemLabel"]')
        if (
          label_element &&
          label_element.textContent ==
            (CHATBOTS['GitHub Copilot'].models as any)[model]
        ) {
          ;(option as HTMLElement).click()
          await new Promise((r) => requestAnimationFrame(r))
          break
        }
      }
    } else if (model) {
      alert(`Model "${model}" is no longer supported.`)
    }
  } else if (is_gemini) {
    if (model && model in CHATBOTS['Gemini'].models) {
      const model_selector_trigger = document.querySelector(
        'button[data-test-id="bard-mode-menu-button"]'
      ) as HTMLButtonElement

      if (model_selector_trigger) {
        model_selector_trigger.click()

        await new Promise((r) => requestAnimationFrame(r))

        const menu_content = document.querySelector('div.mat-mdc-menu-content')
        if (menu_content) {
          const model_options = Array.from(
            menu_content.querySelectorAll('button[mat-menu-item]')
          )

          for (const option of model_options) {
            const name_element = option.querySelector(
              '.title-and-description > span:first-child'
            )

            if (
              name_element &&
              name_element.textContent?.trim() ==
                (CHATBOTS['Gemini'].models as any)[model]
            ) {
              ;(option as HTMLElement).click()
              await new Promise((r) => requestAnimationFrame(r))
              break
            }
          }
        }
      }
    } else if (model) {
      alert(`Model "${model}" is no longer supported.`)
    }
  } else if (is_open_webui) {
    const model_selector_button = document.querySelector(
      'button[id="model-selector-0-button"]'
    ) as HTMLElement
    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const model_selector_menu = document.querySelector(
      'div[aria-labelledby="model-selector-0-button"]'
    ) as HTMLElement
    const model_button = model_selector_menu.querySelector(
      `button[data-value="${model}"]`
    ) as HTMLElement
    if (model_button) {
      model_button.click()
    }
    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  }
}

const set_options = async (options: string[]) => {
  if (is_gemini) {
    const supported_options = CHATBOTS['Gemini'].supported_options || {}
    for (const option of options) {
      if (option == 'canvas' && supported_options['canvas']) {
        const canvas_button = Array.from(
          document.querySelectorAll('button')
        ).find(
          (button) => button.textContent?.trim() == 'Canvas'
        ) as HTMLButtonElement
        if (canvas_button) {
          canvas_button.click()
        }
      }
    }
  } else if (is_deepseek) {
    const supported_options = CHATBOTS['DeepSeek'].supported_options || {}
    let should_ensure_deep_think_is_unchecked = true
    let should_ensure_search_is_unchecked = true
    for (const option of options) {
      if (option == 'deep-think' && supported_options['deep-think']) {
        should_ensure_deep_think_is_unchecked = false
        const deep_think_button = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (button) =>
            button.textContent == 'DeepThink (R1)' ||
            button.textContent == '深度思考 (R1)'
        ) as HTMLElement
        const button_style = window.getComputedStyle(deep_think_button)
        if (
          button_style.getPropertyValue('--ds-button-color') == 'transparent'
        ) {
          deep_think_button.click()
          await new Promise((r) => requestAnimationFrame(r))
        }
      } else if (option == 'search' && supported_options['search']) {
        should_ensure_search_is_unchecked = false
        const search_button = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (button) =>
            button.textContent == 'Search' || button.textContent == '联网搜索'
        ) as HTMLElement
        const button_style = window.getComputedStyle(search_button)
        if (
          button_style.getPropertyValue('--ds-button-color') == 'transparent'
        ) {
          search_button.click()
          await new Promise((r) => requestAnimationFrame(r))
        }
      }
    }
    if (should_ensure_deep_think_is_unchecked) {
      const deep_think_button = Array.from(
        document.querySelectorAll('div[role="button"]')
      ).find(
        (button) =>
          button.textContent == 'DeepThink (R1)' ||
          button.textContent == '深度思考 (R1)'
      ) as HTMLElement
      const button_style = window.getComputedStyle(deep_think_button)
      console.log(button_style.getPropertyValue('--ds-button-color'))
      if (button_style.getPropertyValue('--ds-button-color') != 'transparent') {
        deep_think_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
    if (should_ensure_search_is_unchecked) {
      const search_button = Array.from(
        document.querySelectorAll('div[role="button"]')
      ).find(
        (button) =>
          button.textContent == 'Search' || button.textContent == '联网搜索'
      ) as HTMLElement
      const button_style = window.getComputedStyle(search_button)
      if (
        button_style.getPropertyValue('--ds-button-color') != 'transparent' &&
        button_style.getPropertyValue('--ds-button-color') != '#fff'
      ) {
        search_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
  } else if (is_grok) {
    const supported_options = CHATBOTS['Grok'].supported_options || {}
    for (const option of options) {
      if (option == 'think' && supported_options['think']) {
        const think_button = document.querySelector(
          'button[aria-label="Think"]'
        ) as HTMLButtonElement
        if (think_button) {
          think_button.click()
        }
      }
    }
  }
}

const initialize_chat = async (params: { message: string; chat: Chat }) => {
  if (params.chat.model) {
    await set_model(params.chat.model)
  }
  if (params.chat.system_instructions) {
    await enter_system_instructions(params.chat.system_instructions)
  }
  if (params.chat.temperature) {
    await set_temperature(params.chat.temperature)
  }
  await set_options(params.chat.options || [])

  enter_message_and_send({
    input_element: get_textarea_element(),
    message: params.message
  })

  // Process next chat from the queue
  browser.runtime.sendMessage({
    action: 'chat-initialized'
  })
}

const main = async () => {
  if (!is_gemini_coder_hash) return

  // Remove the hash from the URL to avoid reloading the content script if the page is refreshed
  history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search
  )

  // Get the message using the batch ID from the hash
  const storage_key = `chat-init:${batch_id}`
  const storage = await browser.storage.local.get(storage_key)
  const stored_data = storage[storage_key] as {
    text: string
    current_chat: Chat
    client_id: number
  }

  if (!stored_data) {
    console.error('Chat initialization data not found for batch ID:', batch_id)
    return
  }

  // Now directly use the current_chat instead of searching for it
  const message_text = stored_data.text
  const current_chat = stored_data.current_chat

  if (!current_chat) {
    console.error('Chat configuration not found')
    return
  }

  if (is_ai_studio) {
    await ai_studio.wait_until_ready()
  } else if (is_gemini) {
    await gemini.wait_until_ready()
  } else if (is_chatgpt) {
    await chatgpt.wait_until_ready()
  } else if (is_claude) {
    await claude.wait_until_ready()
  } else if (is_github_copilot) {
    await github_copilot.wait_until_ready()
  } else if (is_mistral) {
    await mistral.wait_until_ready()
  } else if (is_open_webui) {
    await open_webui.wait_until_ready()
  } else if (is_deepseek) {
    await deepseek.wait_until_ready()
  } else if (is_grok) {
    await grok.wait_until_ready()
  } else if (is_openrouter) {
    await openrouter.wait_until_ready()
  }

  await initialize_chat({
    message: message_text,
    chat: current_chat
  })

  // Clean up the storage entry after using it
  await browser.storage.local.remove(storage_key)

  inject_apply_response_button({
    client_id: stored_data.client_id,
    is_ai_studio
  })
}

if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', main)
} else {
  main()
}
