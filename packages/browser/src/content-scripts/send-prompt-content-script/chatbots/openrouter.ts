import { Chatbot } from '../types/chatbot'

export const openrouter: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('textarea')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  enter_system_instructions: async (system_instructions: string) => {
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
  },
  set_temperature: async (temperature: number) => {
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
