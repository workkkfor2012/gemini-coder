---
hide_table_of_contents: true
sidebar_position: 2
---

# Chat

Chat view is a conventient way to generate coding prompts for chatbots.

:::tip

As longer conversations notably decrease model's performance, instead of submitting follow-up messages in the chatbot consider starting with refined instructions.

:::

## Workflow

1. **Select Context:**
   Check all relevant files.

2. **Write your instructions:**
   Provide the model details of your expectations.

3. **Choose preset:**
   Use your favourite chatbot with desired configuration.

4. **Interact:**
   Enter follow-up prompts in the web browser or refine context and instructions in the editor.

5. **Apply changes:**
   Just copy the response and use the [Apply Chat Response](/docs/features/apply-changes) feature to integrate the suggested changes automatically.

## Compatibility

- **AI Studio**
- **Gemini**
- Open WebUI (self-hosted)
- ChatGPT
- Claude
- GitHub Copilot
- Grok
- DeepSeek
- Mistral
- HuggingChat

## Presets

Preset is a general or task specific web chat configuration.

Each preset can include:

- Chatbot to run (ChatGPT, Gemini, Claude, etc.)
- Prompt prefix/suffix
- Model selection
- System instructions
- Temperature
- Options

[Learn more...](./presets)

## Available commands

##### `Gemini Coder: Web Chat`

Opens a chat session in your browser with the current context and prompt.

##### `Gemini Coder: Web Chat with...`

Lets you select which AI platform to use for your chat session.

##### `Gemini Coder: Chat to Clipboard`

Instead of opening a chat directly, copies the context and prompt to your clipboard for manual pasting.
