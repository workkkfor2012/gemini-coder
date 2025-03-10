---
title: Chat
layout: home
parent: Usage
nav_order: 2
description: Connect VS Code with web-based AI platforms for seamless code assistance using Gemini Coder's Chat feature
---

# Chat

Gemini Coder's Chat feature provides a seamless way to interact with various AI platforms directly from VS Code. By connecting your editor with web-based AI services, you can send code context and prompts without constant copy-pasting, while taking advantage of the superior developer experience (tabs, public sharing, canvas, etc.).

---

## Workflow

1.  **Select Context** — Choose relevant files by opening them or selecting in the Workspace view.
2.  **Write Your Prompt** — Enter your instruction.
3.  **Choose Chat Provider** — Select one or more chatbots for hands-free initialization.
4.  **Interact** — Enter follow-up prompts in the web browser or start over with updated context and prompt (better results).
5.  **Apply changes** — After getting response from the AI platform, you can use the [Apply Changes](/docs/usage/applying-changes.html) feature to integrate the suggested changes to each modified file.

---

## Supported AI chatbots

Gemini Coder integrates with numerous popular chatbots. AI Studio supports applying additional configuration (model, system instructions, temperature) specified in presets.

| Chatbot        | Initialization | Model | System Instructions | Temperature | Max input tokens |
| -------------- | :------------: | :---: | :-----------------: | :---------: | :--------------: |
| **AI Studio**  |       ✅       |  ✅   |         ✅          |     ✅      |      1-2M\*      |
| **Gemini**     |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| ChatGPT        |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| Claude         |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| GitHub Copilot |       ✅       |  ❌   |         ❌          |     ❌      |     8-17k\*      |
| Grok           |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| DeepSeek       |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| Mistral        |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| Open WebUI     |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |

\* Depends on factors like used model and plan.

---

## Presets

Preset is a web chat configuration for specialized use case.

Each preset can include:

- Target platform (ChatGPT, Gemini, Claude, etc.)
- Prompt prefix/suffix
- Model selection (for supported platforms)
- Temperature setting
- Custom system instructions

---

## Browser Extension

The [browser extension](/docs/installation.html#browser-extension) establishes a WebSocket connection with VS Code, allowing hands-free chat initialization with your selected context and prompt.

---

## Best Practices

### Focused Context

Select only relevant files to avoid overwhelming the AI with irrelevant information.

### Clear Instructions

Frame your questions specifically, mentioning any constraints or requirements.

### Multiple Providers

Compare responses across different AI platforms for challenging problems.

### Leverage Presets

Create presets for specific tasks (debugging, refactoring, explaining) with appropriate prompt prefixes and suffixes.

## Available Commands

### `Gemini Coder: Web Chat`

Opens a chat session in your browser with the current context and prompt.

### `Gemini Coder: Web Chat with...`

Lets you select which AI platform to use for your chat session.

### `Gemini Coder: Chat to Clipboard`

Instead of opening a chat directly, copies the context and prompt to your clipboard for manual pasting.
