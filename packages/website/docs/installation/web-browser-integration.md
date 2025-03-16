---
hide_table_of_contents: true
---

# Web browser integration

For the hands-free chat initialization and enhanced context by selected websites, you'll need to install the **Gemini Coder Connector**. This extension connect to a WebSocket server run in a VS Code process, enabling automatic launching of chats with your selected context and prompt over localhost.

The connector extension is completely [open source](https://github.com/robertpiosik/gemini-coder/tree/master/packages/browser).

## Installation Links

- [Chrome Web Store](https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/)

<details>
<summary><strong>How it works?</strong></summary>

The browser connector maintains a persistent WebSocket connection with your VS Code instance, enabling real-time communication between the two:

1. **Connection establishment**: The extension automatically attempts to connect to the local WebSocket server running in VS Code managed process on port `55155`.
2. **Secure communication**: The connection uses security tokens to validate and authenticate communication between your browser and VS Code.
3. **Automatic reconnection**: Whenever you reopen the editor, the connection is up instantly.

When you select context, enter instruction and submit, the web browser receives message and opens a new tab with the preset-defined chatbot (or multiple chatbots if you select more presets to open by default), inserts the message and submits hands-free.

</details>

<details>
<summary><strong>Permissions</strong></summary>

The extension needs only these basic permissions:

### Selected URLs

The extension injects a [context script](https://github.com/robertpiosik/gemini-coder/blob/master/packages/browser/src/content-scripts/send-prompt-content-script.ts) for chat initialization in supported chatbots:

- https://gemini.google.com/app
- https://aistudio.google.com/prompts/new_chat
- https://chatgpt.com/
- https://chat.deepseek.com/
- https://github.com/copilot
- https://claude.ai/new
- https://chat.mistral.ai/chat
- https://grok.com/
- https://huggingface.co/chat/
- http://openwebui/

### Storage

Used to temporarily store the message (context and prompt) for the injected [context script](https://github.com/robertpiosik/gemini-coder/blob/master/packages/browser/src/content-scripts/send-prompt-content-script.ts) to use.

### Alarms

(Chrome only) Used for keeping the WebSocket connection in the extension's service worker alive.

</details>
