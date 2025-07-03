import browser from 'webextension-polyfill'
import { Chat } from '@shared/types/websocket-message'
import { Chatbot } from './types/chatbot'
import { Message } from '@/types/messages'
import {
  ai_studio,
  gemini,
  chatgpt,
  claude,
  mistral,
  open_webui,
  deepseek,
  grok,
  openrouter,
  qwen,
  yuanbao,
  doubao,
  huggingchat
} from './chatbots'
import { perplexity } from './chatbots/perplexity'

// In case it changes before finding textarea element (e.g. in mobile AI Studio, when changing model)
const current_url = window.location.href

// Extract batch ID or session ID from URL hash if available
const hash = window.location.hash
const hash_prefix_old = '#gemini-coder'
const hash_prefix_new = '#cwc'
const session_prefix = '#cwc-session-'
const is_gemini_coder_hash = hash.startsWith(hash_prefix_old)
const is_cwc_hash = hash.startsWith(hash_prefix_new) && !hash.startsWith(session_prefix)
const is_session_hash = hash.startsWith(session_prefix)

// 提取会话ID或批次ID
let batch_id = ''
let session_id = ''

if (is_session_hash) {
  session_id = hash.substring(session_prefix.length)
} else if (is_gemini_coder_hash) {
  batch_id = hash.substring(hash_prefix_old.length + 1) || 'default'
} else if (is_cwc_hash) {
  batch_id = hash.substring(hash_prefix_new.length + 1) || 'default'
}

const ai_studio_url = 'https://aistudio.google.com/prompts/new_chat'
const is_ai_studio = current_url.startsWith(ai_studio_url)

const gemini_url = 'https://gemini.google.com/app'
const is_gemini = current_url.startsWith(gemini_url)

const openrouter_url = 'https://openrouter.ai/chat'
const is_openrouter = current_url.startsWith(openrouter_url)

const chatgpt_url = 'https://chatgpt.com/'
const is_chatgpt = current_url.startsWith(chatgpt_url)

const claude_url = 'https://claude.ai/new'
const is_claude = current_url.startsWith(claude_url)

const deepseek_url = 'https://chat.deepseek.com/'
const is_deepseek = current_url.startsWith(deepseek_url)

const mistral_url = 'https://chat.mistral.ai/chat'
const is_mistral = current_url.startsWith(mistral_url)

const qwen_url = 'https://chat.qwen.ai/'
const is_qwen = current_url.startsWith(qwen_url)

const yuanbao_url = 'https://yuanbao.tencent.com/chat'
const is_yuanbao = current_url.startsWith(yuanbao_url)

const grok_url = 'https://grok.com/'
const is_grok = current_url.startsWith(grok_url)

const doubao_url = 'https://www.doubao.com/chat/'
const is_doubao = current_url.startsWith(doubao_url)

const huggingchat_url = 'https://huggingface.co/chat/'
const is_huggingchat = current_url.startsWith(huggingchat_url)

// perplexity
const perplexity_url = 'https://www.perplexity.ai/'
const is_perplexity = current_url.startsWith(perplexity_url)

const is_open_webui = document.title.includes('Open WebUI')

let chatbot: Chatbot | null = null

if (is_ai_studio) {
  chatbot = ai_studio
} else if (is_gemini) {
  chatbot = gemini
} else if (is_chatgpt) {
  chatbot = chatgpt
} else if (is_claude) {
  chatbot = claude
} else if (is_mistral) {
  chatbot = mistral
} else if (is_open_webui) {
  chatbot = open_webui
} else if (is_deepseek) {
  chatbot = deepseek
} else if (is_grok) {
  chatbot = grok
} else if (is_openrouter) {
  chatbot = openrouter
} else if (is_qwen) {
  chatbot = qwen
} else if (is_yuanbao) {
  chatbot = yuanbao
} else if (is_doubao) {
  chatbot = doubao
} else if (is_huggingchat) {
  chatbot = huggingchat
} else if (is_perplexity) {
  chatbot = perplexity
}

export const get_textarea_element = () => {
  const chatbot_selectors = {
    [ai_studio_url]: 'textarea',
    [gemini_url]: 'div[contenteditable="true"]',
    [openrouter_url]: 'textarea',
    [chatgpt_url]: 'div#prompt-textarea',
    [claude_url]: 'div[contenteditable=true]',
    [deepseek_url]: 'textarea',
    [mistral_url]: 'div[contenteditable="true"]',
    [yuanbao_url]: 'div[contenteditable="true"]',
    [doubao_url]: 'textarea',
    [perplexity_url]: 'textarea'
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
    await new Promise((r) => requestAnimationFrame(r))
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
      form.requestSubmit()
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
    if (is_openrouter || is_mistral) {
      await new Promise((r) => setTimeout(r, 500))
    }
    if (form) {
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

const initialize_chat = async (params: { message: string; chat: Chat }) => {
  if (params.chat.model && chatbot?.set_model) {
    await chatbot.set_model(params.chat.model)
  }
  if (params.chat.system_instructions && chatbot?.enter_system_instructions) {
    await chatbot.enter_system_instructions(params.chat.system_instructions)
  }
  if (params.chat.temperature !== undefined && chatbot?.set_temperature) {
    await chatbot.set_temperature(params.chat.temperature)
  }
  if (params.chat.top_p !== undefined && chatbot?.set_top_p) {
    await chatbot.set_top_p(params.chat.top_p)
  }
  if (chatbot?.set_options) {
    await chatbot.set_options(params.chat.options || [])
  }

  if (chatbot?.enter_message_and_send) {
    await chatbot.enter_message_and_send(params.message)
  } else {
    await enter_message_and_send({
      input_element: get_textarea_element(),
      message: params.message
    })
  }

  // Process next chat from the queue
  browser.runtime.sendMessage<Message>({
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

  if (chatbot?.wait_until_ready) {
    await chatbot.wait_until_ready()
  }

  await initialize_chat({
    message: message_text,
    chat: current_chat
  })

  // Clean up the storage entry after using it
  await browser.storage.local.remove(storage_key)

  if (chatbot?.inject_apply_response_button) {
    chatbot.inject_apply_response_button(stored_data.client_id)
  }
}

// 监听来自background script的会话消息
browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any): any => {
  if (message.action === 'initialize-session') {
    // 处理会话初始化
    handle_session_initialization(message)
    return true // 异步处理
  } else if (message.action === 'send-message') {
    // 处理发送消息到现有会话
    handle_send_message_to_session(message)
    return true // 异步处理
  }
  return false // 不处理的消息
})

// 获取当前聊天配置
const get_current_chat = (): Chat | null => {
  // 基于当前URL和chatbot创建基本的聊天配置
  const base_chat: Chat = {
    url: current_url.split('#')[0].split('?')[0],
    model: undefined,
    temperature: undefined,
    top_p: undefined,
    system_instructions: undefined,
    options: []
  }

  return base_chat
}

// 处理会话初始化
const handle_session_initialization = async (message: any) => {
  try {
    // 使用传入的chatConfig而不是自动生成的配置
    const chat_config_from_message = message.chatConfig
    if (!chat_config_from_message) {
      console.error('Chat configuration not found for session initialization')
      return
    }

    if (chatbot?.wait_until_ready) {
      await chatbot.wait_until_ready()
    }

    await initialize_chat({
      message: message.initialPrompt,
      chat: chat_config_from_message
    })

    if (chatbot?.inject_apply_response_button) {
      // 使用传入的client_id而不是默认值
      chatbot.inject_apply_response_button(message.client_id || 0)
    }
  } catch (error) {
    console.error('Failed to initialize session:', error)
  }
}

// 处理发送消息到会话
const handle_send_message_to_session = async (message: any) => {
  try {
    // 使用通用的消息发送方法
    if (chatbot?.enter_message_and_send) {
      await chatbot.enter_message_and_send(message.prompt)
    } else {
      await enter_message_and_send({
        input_element: get_textarea_element(),
        message: message.prompt
      })
    }
  } catch (error) {
    console.error('Failed to send message to session:', error)
  }
}

if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', main)
} else {
  main()
}
