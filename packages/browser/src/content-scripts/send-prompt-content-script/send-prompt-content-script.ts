import browser from 'webextension-polyfill'
import { Chat } from '@shared/types/websocket-message'
import { inject_apply_changes_buttons } from './inject-apply-changes-buttons'

console.log('[send-prompt-content-script] Script loaded and running.'); // Log script load
// In case it changes before finding textarea element (e.g. in mobile AI Studio, when changing model)
const current_url = window.location.href

// Extract batch ID from URL hash if available
const hash = window.location.hash
const hash_prefix = '#gemini-coder'
const is_gemini_coder_hash = hash.startsWith(hash_prefix)
const batch_id = is_gemini_coder_hash
  ? hash.substring(hash_prefix.length + 1) || 'default'
  : ''

const ai_studio_url =
  'https://aistudio.google.com/prompts/new_chat#gemini-coder'
// Use a more general check for AI Studio URL
const is_ai_studio = current_url.includes('aistudio.google.com/')

const gemini_url = 'https://gemini.google.com/app#gemini-coder'
const is_gemini = current_url.includes('gemini.google.com/app')

const chatgpt_url = 'https://chatgpt.com/#gemini-coder'
const is_chatgpt = current_url.includes('chatgpt.com/')

const claude_url = 'https://claude.ai/new#gemini-coder'
const is_claude = current_url.includes('claude.ai/new')

const github_copilot_url = 'https://github.com/copilot#gemini-coder'
const is_github_copilot = current_url.includes('github.com/copilot')

const deepseek_url = 'https://chat.deepseek.com/#gemini-coder'
const is_deepseek = current_url.includes('chat.deepseek.com/')

const mistral_url = 'https://chat.mistral.ai/chat#gemini-coder'
const is_mistral = current_url.includes('chat.mistral.ai/chat')

const grok_url = 'https://grok.com/#gemini-coder'
const is_grok = current_url.includes('grok.com/')

// No need for special handling
// const huggingchat_url = 'https://huggingface.co/chat/'
// const is_huggingchat = current_url == huggingchat_url

const is_open_webui = document.title.includes('Open WebUI')

export const get_textarea_element = () => {
  // Define selectors based on the *base* URL without hash
  const chatbot_selectors: Record<string, string> = {
    'aistudio.google.com/': 'textarea[aria-label="Type something"]', // AI Studio
    'gemini.google.com/app': 'div[contenteditable="true"]',          // Gemini App
    'chatgpt.com/': 'div#prompt-textarea',                           // ChatGPT
    'claude.ai/new': 'div[contenteditable=true]',                     // Claude (New Chat)
    'github.com/copilot': 'textarea#copilot-chat-textarea',          // GitHub Copilot
    'chat.deepseek.com/': 'textarea',                                // Deepseek
    'chat.mistral.ai/chat': 'textarea'                               // Mistral
    // Add other selectors as needed
  }

  let selector: string | null = null;
  for (const [domain_path, sel] of Object.entries(chatbot_selectors)) {
      // Check if the current URL includes the domain/path key
      if (current_url.includes(domain_path)) {
          selector = sel;
          console.log(`[send-prompt-content-script] Matched URL pattern: ${domain_path}, using selector: ${selector}`);
          break;
      }
  }

  // Fallback to active element if no specific selector found or matches
  const target_element = selector
    ? (document.querySelector(selector) as HTMLElement | null)
    : (document.activeElement as HTMLElement | null);

  if (!target_element && selector) {
      console.warn(`[send-prompt-content-script] Could not find element with selector "${selector}", falling back to active element.`);
      return document.activeElement as HTMLElement | null;
  }
  if (!target_element && !selector) {
      console.warn(`[send-prompt-content-script] No matching URL pattern found, using active element.`);
  }

  return target_element;
}

/**
 * Injects text into a textarea or contenteditable element without sending/submitting.
 */
const inject_text_into_element = (params: {
  input_element: HTMLElement | null
  text: string
}) => {
  if (!params.input_element) {
    console.warn('[send-prompt-content-script] Cannot inject text: input element not found or null.')
    return
  }

  if (params.input_element.isContentEditable) {
    params.input_element.innerText = params.text
    // Dispatch input and change events for frameworks that might listen
    params.input_element.dispatchEvent(new Event('input', { bubbles: true }))
    params.input_element.dispatchEvent(new Event('change', { bubbles: true }))
    console.log('[send-prompt-content-script] Injected text into contenteditable element.')
  } else if (params.input_element.tagName === 'TEXTAREA') {
    (params.input_element as HTMLTextAreaElement).value = params.text
    // Dispatch input and change events
    params.input_element.dispatchEvent(new Event('input', { bubbles: true }))
    params.input_element.dispatchEvent(new Event('change', { bubbles: true }))
    console.log('[send-prompt-content-script] Injected text into textarea element.')
  } else {
    console.warn('[send-prompt-content-script] Cannot inject text: element is not a textarea or contenteditable.')
  }
}

const enter_message_and_send = async (params: {
  input_element: HTMLElement | null
  message: string
}): Promise<void> => {
  if (!params.input_element) {
      console.error('[send-prompt-content-script] Cannot send message: input element is null.');
      return;
  }

  // Inject the text first
  // Append a space to the message to potentially trigger input detection
  const message_with_space = params.message + ' ';

  if (params.input_element.isContentEditable) {
    params.input_element.innerText = message_with_space;
    params.input_element.dispatchEvent(new Event('input', { bubbles: true }));
    params.input_element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (params.input_element.tagName === 'TEXTAREA') {
    (params.input_element as HTMLTextAreaElement).value = message_with_space;
    params.input_element.dispatchEvent(new Event('input', { bubbles: true }));
    params.input_element.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
      console.error('[send-prompt-content-script] Cannot inject message before sending: element is not textarea or contenteditable.');
      return;
  }

  // Start monitoring for response completion with 2s delay
  let responseObserver: MutationObserver;
  const startMonitoring = () => {
    console.log('[send-prompt-content-script] Starting to monitor for response completion');
    responseObserver = new MutationObserver(() => {
      // Step 1: Check if chat session exists
      const chatSession = document.querySelector('ms-chat-session');
      if (!chatSession) {
        console.log('[send-prompt-content-script] No chat session found');
        return;
      }

      // Step 2: Check if any chat turns exist
      const chatTurns = chatSession.querySelectorAll('ms-chat-turn');
      if (chatTurns.length === 0) {
        console.log('[send-prompt-content-script] No chat turns found');
        return;
      }
      console.log(`[send-prompt-content-script] Found ${chatTurns.length} chat turns`);

      // Step 3: Get last chat turn
      const lastTurn = chatTurns[chatTurns.length - 1];
      
      // Step 4: Check for good response button
      const goodResponseBtn = lastTurn.querySelector('button[aria-label="Good response"]');
      if (goodResponseBtn) {
        console.log('[send-prompt-content-script] Model response completed - Good response button found in last turn');
        
        // Wait 1s for actions-container to appear after goodResponseBtn
        setTimeout(() => {
          const outerContainer = lastTurn.querySelector('.actions-container') as HTMLElement;
          if (outerContainer) {
            outerContainer.style.display = 'block';
            outerContainer.style.visibility = 'visible';
            console.log('[send-prompt-content-script] Forced display of outer actions container');
            
            // Find and show inner actions container
            const actionsContainer = outerContainer.querySelector('.actions.hover-or-edit') as HTMLElement;
            if (actionsContainer) {
              // Force show the container and ensure proper styling
              actionsContainer.style.display = 'flex';
              actionsContainer.style.opacity = '1';
              actionsContainer.style.visibility = 'visible';
              console.log('[send-prompt-content-script] Forced display of inner actions container');
              
              // Model response text retrieval removed as per feedback
              
              // Then find and click the options button inside ms-chat-turn-options
              const optionsButton = actionsContainer.querySelector('ms-chat-turn-options button[aria-label="Open options"]') as HTMLElement;
              if (optionsButton) {
                optionsButton.click();
                console.log('[send-prompt-content-script] Opened options menu');
                
                // Wait for menu to open then click Copy button
                setTimeout(() => {
                  const copyButton = document.querySelector('button.mat-mdc-menu-item .copy-rendered-button')?.closest('button');
                  if (copyButton) {
                    console.log('[send-prompt-content-script] Found Copy button - first click');
                    copyButton.click(); // First click

                    // Read clipboard content after first click
                    setTimeout(() => {
                      navigator.clipboard.readText()
                        .then(clipboardText => {
                          console.log('[send-prompt-content-script] Clipboard content after FIRST click:', clipboardText);
                        })
                        .catch(err => {
                          console.log('[send-prompt-content-script] Could not read clipboard after first click:', err);
                        });
                    }, 100); // Wait 100ms for clipboard to potentially update

                    // Wait another 100ms then click again
                    setTimeout(() => {
                      console.log('[send-prompt-content-script] Second copy button click');
                      copyButton.click(); // Second click

                      // Read clipboard content and log it after second click
                      setTimeout(() => {
                        navigator.clipboard.readText()
                          .then(clipboardText => {
                            console.log('[send-prompt-content-script] Clipboard content after SECOND click:', clipboardText);
                            // Send the clipboard content back to the background script
                            browser.runtime.sendMessage({
                              action: 'clipboard-content-ready',
                              text: clipboardText
                            }).catch(err => console.error("Error sending clipboard content to background:", err));
                          })
                          .catch(err => {
                            console.log('[send-prompt-content-script] Could not read clipboard after second click:', err);
                          });
                      }, 100); // Wait 100ms for clipboard to potentially update
                    }, 200); // Total delay 200ms before second click (100ms after first read)
                  }
                  
                  // Set completion flag
                  browser.storage.local.set({
                    'model-response-completed': true // Removed last-response-text storage
                  }).then(() => {
                    console.log('[send-prompt-content-script] Set completion flags');
                  });
                }, 300);
              } else {
                console.log('[send-prompt-content-script] ms-chat-turn-options not found');
              }
            } else {
              console.log('[send-prompt-content-script] inner actions container not found');
            }
          } else {
            console.log('[send-prompt-content-script] outer actions container not found');
          }
          
          responseObserver.disconnect();
        }, 1000);
        
        responseObserver.disconnect();
      }
    });

    responseObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  setTimeout(startMonitoring, 2000);

  // Now try to send/submit
  const form = params.input_element?.closest('form');

  // First send attempt
  if (is_claude) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const claude_button = document.querySelector('fieldset > div:first-child button') as HTMLElement | null;
    if (claude_button) {
        claude_button.click();
        // Second send attempt after 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        claude_button.click();
    }
  } else if (is_ai_studio) {
    const send_button_aria = document.querySelector('button[aria-label="Run"]') as HTMLElement | null;
    if (send_button_aria) {
        send_button_aria.click();
        // Second send attempt after 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        send_button_aria.click();
    }
  } else if (form && !is_github_copilot) {
    form.requestSubmit();
    // Second send attempt after 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    form.requestSubmit();
  } else {
    const enter_event = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    });
    params.input_element.dispatchEvent(enter_event);
    // Second send attempt after 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    params.input_element.dispatchEvent(enter_event);
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
        (option as HTMLElement).click()
        break
      }
    }
  } else if (is_github_copilot) {
    // Map model identifiers to displayed text
    const model_map: Record<string, string> = {
      '4o': 'GPT-4o',
      o1: 'o1',
      'o3-mini': 'o3-mini',
      'sonnet-3.5': 'Claude 3.5 Sonnet',
      'sonnet-3.7': 'Claude 3.7 Sonnet',
      'sonnet-3.7-thinking': 'Claude 3.7 Sonnet Thinking',
      'gemini-2.0-flash': 'Gemini 2.0 Flash'
    }

    // Only proceed if the model exists in our map
    if (model && model in model_map) {
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
        if (label_element && label_element.textContent == model_map[model]) {
          (option as HTMLElement).click()
          await new Promise((r) => requestAnimationFrame(r))
          break
        }
      }
    } else if (model) {
      console.warn(`Model "${model}" not found in model map for GitHub Copilot`)
    }
  }
}

const enable_canvas_mode = async () => {
  if (is_gemini) {
    const canvas_button = document.querySelector(
      'toolbox-drawer mat-icon[data-mat-icon-name="edit_note"]'
    ) as HTMLElement
    if (canvas_button) {
      canvas_button.click()
    } else {
      console.warn('Canvas button not found')
    }
  }
}

const initialize_chat = async (params: { message: string; chat: Chat }) => {
  if (params.chat.system_instructions) {
    await enter_system_instructions(params.chat.system_instructions)
  }
  if (params.chat.model) {
    await set_model(params.chat.model)
  }
  if (params.chat.temperature) {
    await set_temperature(params.chat.temperature)
  }

  // Check for canvas option and enable it if necessary
  if (params.chat.options && params.chat.options.includes('canvas')) {
    await enable_canvas_mode()
  }

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
  // --- Logic for handling initialization via URL hash ---
  if (is_gemini_coder_hash) {
      console.log('[send-prompt-content-script] Found gemini-coder hash, initializing chat...');
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
        console.error('[send-prompt-content-script] Chat initialization data not found for batch ID:', batch_id)
        return
      }

      // Now directly use the current_chat instead of searching for it
      const message_text = stored_data.text
      const current_chat = stored_data.current_chat

      if (!current_chat) {
        console.error('[send-prompt-content-script] Chat configuration not found')
        return
      }

      // Quirks mitigation (Wait for page elements to likely be ready)
      // Consider more robust checks if needed
      if (is_ai_studio) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay for AI Studio
      } else if (is_gemini) {
         await new Promise(resolve => setTimeout(resolve, 500));
      } else if (is_chatgpt) {
         await new Promise(resolve => setTimeout(resolve, 500));
         const reason_button = document.querySelector('button[aria-label="Reason"]') as HTMLButtonElement | null
         reason_button?.click() // Dismiss potential overlays
         await new Promise(resolve => setTimeout(resolve, 100));
      } else if (is_claude) {
         await new Promise(resolve => setTimeout(resolve, 500));
      } else {
         await new Promise(resolve => setTimeout(resolve, 500)); // Generic delay
      }

      console.log('[send-prompt-content-script] Initializing chat with data:', stored_data);
      await initialize_chat({
        message: message_text,
        chat: current_chat
      })

      // Clean up the storage entry after using it
      await browser.storage.local.remove(storage_key)
      console.log('[send-prompt-content-script] Removed chat initialization data for batch ID:', batch_id);

      // Inject apply changes buttons *after* initialization
      inject_apply_changes_buttons({
        client_id: stored_data.client_id,
        is_ai_studio
      })
  } else {
      // If not initializing via hash, still inject apply changes buttons
      // Need a way to get client_id if not from stored_data
      // For now, let's assume client_id might come from a different message or default to 0
      console.log('[send-prompt-content-script] No gemini-coder hash found, injecting apply buttons only.');
      inject_apply_changes_buttons({ client_id: 0, is_ai_studio }); // Use default client_id 0 for now
  }
}

if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', main)
} else {
  main()
}

// --- New Message Listener for handling inject command from background script ---
console.log('[send-prompt-content-script] Setting up onMessage listener.'); // Log listener setup
browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  console.log('[send-prompt-content-script] Received message:', message) // Log all received messages
  if (message && message.action === 'do_inject' && typeof message.text === 'string') {
    console.log(`[send-prompt-content-script] Handling 'do_inject' action with text: "${message.text}"`)
    const target_element = get_textarea_element()
    if (target_element) {
      console.log('[send-prompt-content-script] Found target element:', target_element);
      // Use enter_message_and_send to inject AND attempt to send
      enter_message_and_send({
          input_element: target_element,
          message: message.text
      }).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      // Return true to indicate we will respond asynchronously
      return true;
    } else {
      console.error('[send-prompt-content-script] Could not find target input element to inject text.')
      sendResponse({ success: false, error: 'Input element not found' });
      return true;
    }
  }
  // For unhandled messages, return true but don't call sendResponse
  return true;
})
