---
hide_table_of_contents: true
---

# Web browser integration

For the hands-free chat initialization and enhancing context with selected websites, you'll need to install the **Code Web Chat Connector**.

The connector extension is [open source](https://github.com/robertpiosik/CodeWebChat/tree/master/packages/browser).

- [Chrome Web Store](https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/)

<details>
<summary><strong>How it works?</strong></summary>

Websockets are used as reliable bi-directional communication channel for message passing between the editor and the web browser.

**Connection establishment**: The extension automatically attempts to connect to the local WebSocket server managed by the main VS Code extension on port `55155`.

**Automatic reconnection**: Whenever you reopen the editor, the connection is up instantly.

**Message types**:

- **From Editor to Browser:** When you trigger the "Initialize Chats" action in VS Code, a message is sent to the browser extension. This message contains the text (context & prompt) and a list of target chat websites (like Gemini, ChatGPT, etc.) along with any specific configurations (model, temperature). The browser extension then opens new tabs for each specified chat service and injects the provided text.

  _Example:_

  ```json
  {
    "action": "initialize-chats",
    "text": "<files><file path="...">...</file>...</files> Help implement according to the following specification:",
    "chats": [
      {
        "url": "https://aistudio.google.com/prompts/new_chat",
        "model": "gemini-2.5-pro-preview-03-25",
        "temperature": 0.5,
        "system_instructions": "You are a helpful assistant."
      },
      { "url": "https://gemini.google.com/app" },
    ]
  }
  ```

- **From Browser to Editor**: When you use the browser extension's popup to save the current website for context, the extension extracts the page title and content (or selected text). It sends this information back to the VS Code extension, which updates its list of saved websites available for context.

  _Example:_

  ```json
  {
    "action": "update-saved-websites",
    "websites": [
      {
        "url": "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API",
        "title": "WebSockets API - Web APIs | MDN",
        "content": "The WebSocket API is an advanced technology...",
        "favicon": "data:image/png;base64,..."
      }
      ...
    ]
  }
  ```

- **From Server to Editor**: The WebSocket server sends this message to the VS Code extension whenever a browser extension connects or disconnects. This allows the VS Code extension to know if it can communicate with a browser.

  _Example:_

  ```json
  {
    "action": "browser-connection-status",
    "has_connected_browser": true
  }
  ```

- **From Server to Browser**: The WebSocket server periodically sends a simple `ping` message to the connected browser extension to help keep the WebSocket connection alive, especially in environments that might close inactive connections.

  _Example:_

  ```json
  {
    "action": "ping"
  }
  ```

</details>

<details>
<summary><strong>Permissions</strong></summary>

The extension needs only these basic permissions:

### Selected URLs

The extension uses a [content script](https://github.com/robertpiosik/CodeWebChat/blob/master/packages/browser/src/content-scripts/send-prompt-content-script.ts) for chat initializations in supported chatbots:

- `https://gemini.google.com/app`
- `https://aistudio.google.com/prompts/new_chat`
- `https://chatgpt.com/`
- `https://chat.deepseek.com/`
- `https://claude.ai/new`
- `https://chat.mistral.ai/chat`
- `https://grok.com/`
- `https://huggingface.co/chat/`
- `http://openwebui/`
- `http://localhost:*/`

### `storage`

Used to temporarily store the message (context and instructions) for the content script to use.

### `alarms`

Keeps the connection with the editor alive (chrome only).

</details>
