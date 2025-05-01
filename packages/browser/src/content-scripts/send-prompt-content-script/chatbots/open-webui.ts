import { Chatbot } from '../types/chatbot'

export const open_webui: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (
          document.querySelector(
            '#chat-container img[src="/static/favicon.png"]'
          )
        ) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  enter_system_instructions: async (system_instructions: string) => {
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
  },
  set_temperature: async (temperature: number) => {
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
    const button = fifth_div.querySelector('button') as HTMLElement
    button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const input = fifth_div.querySelector('input') as HTMLInputElement
    input.value = temperature.toString()
    input.dispatchEvent(new Event('change', { bubbles: true }))
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    close_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_top_p: async (top_p: number) => {
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
      'div:nth-child(12)'
    ) as HTMLElement
    const button = fifth_div.querySelector('button') as HTMLElement
    button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const input = fifth_div.querySelector('input') as HTMLInputElement
    input.value = top_p.toString()
    input.dispatchEvent(new Event('change', { bubbles: true }))
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    close_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_model: async (model: string) => {
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
