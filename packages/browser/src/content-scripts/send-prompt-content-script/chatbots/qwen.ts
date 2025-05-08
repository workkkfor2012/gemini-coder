import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'

export const qwen: Chatbot = {
  wait_until_ready: async () => {
    const start_timestamp = Date.now()
    // Wait for model selector to be ready (includes one of the available models)
    await new Promise((resolve) => {
      const check_for_element = () => {
        const model_selector_button = document.querySelector(
          'button#model-selector-0-button'
        ) as HTMLElement

        if (
          Date.now() - start_timestamp > 3000 ||
          (model_selector_button &&
            model_selector_button.textContent &&
            Object.values(CHATBOTS['Qwen'].models).includes(
              model_selector_button.textContent.trim()
            ))
        ) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_model: async (model: string) => {
    const model_selector_button = document.querySelector(
      'button#model-selector-0-button'
    ) as HTMLElement

    // The model is already selected
    if (
      model_selector_button.textContent?.trim() ==
      (CHATBOTS['Qwen'].models as any)[model]
    ) {
      return
    }

    model_selector_button.click()
    if (window.innerWidth >= 768) {
      await new Promise((r) => requestAnimationFrame(r))
    } else {
      // Opening drawer...
      await new Promise((r) => setTimeout(r, 500))
    }
    const model_buttons = document.querySelectorAll(
      'div[aria-labelledby="model-selector-0-button"] button[aria-label="model-item"]'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(model_buttons)) {
      const model_name_element = (button.querySelector('div.text-sm') ||
        button.querySelector('div.text-15')) as HTMLDivElement
      if (
        model_name_element.textContent ==
        (CHATBOTS['Qwen'].models as any)[model]
      ) {
        button.click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (options: string[]) => {
    // Make sure thinking is not selected
    const buttons = document.querySelectorAll(
      '.chat-message-input button.chat-input-feature-btn'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(buttons)) {
      if (button.querySelector('i.icon-line-deepthink-01')) {
        // if button has class name active, click it
        if (button.classList.contains('active')) {
          button.click()
        }
      }
    }
    // Now check click any feature requested
    const supported_options = CHATBOTS['Qwen'].supported_options
    for (const option of options) {
      if (option == 'thinking' && supported_options['thinking']) {
        const buttons = document.querySelectorAll(
          '.chat-message-input button.chat-input-feature-btn'
        ) as NodeListOf<HTMLButtonElement>
        for (const button of Array.from(buttons)) {
          if (button.querySelector('i.icon-line-deepthink-01')) {
            button.click()
          }
        }
      }
    }
  },
  enter_message_and_send: async (message: string) => {
    let instructions = message
    if (message.includes('<files>')) {
      instructions = message.split('<files>')[0]
      const context = message.split('<files>')[1].split('</files>')[0].trim()

      // Upload file
      const file_input = document.querySelector(
        'input#filesUpload'
      ) as HTMLInputElement
      const blob = new Blob([context], { type: 'text/plain' })
      const file = new File([blob], 'message.txt', { type: 'text/plain' })
      const data_transfer = new DataTransfer()
      data_transfer.items.add(file)
      file_input.files = data_transfer.files
      file_input.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((resolve) => {
        const check_for_element = () => {
          if (
            !document.querySelector(
              '.chat-message-input path[d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"]'
            )
          ) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        }
        check_for_element()
      })
    }

    // Enter instructions
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    input_element.value = instructions
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))

    // Submit
    const submit_button = document.querySelector(
      'button#send-message-button'
    ) as HTMLButtonElement
    submit_button.click()
  }
}
