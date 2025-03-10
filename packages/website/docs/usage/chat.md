---
title: Chat
layout: home
parent: Usage
nav_order: 2
description: Connect VS Code with web-based AI platforms for seamless code assistance using Gemini Coder's Chat feature
---

# Chat

Gemini Coder's Chat feature provides a seamless way to interact with various AI platforms directly from VS Code. By connecting your editor with web-based AI services, you can send code context and prompts without constant copy-pasting, while taking advantage of the superior experiences these platforms offer (tabs, public sharing, canvas, etc.).

---

## Workflow

### Select Context

Choose relevant files using the Context View to include in your conversation.

### Write Your Prompt

Enter your instruction in the chat input area.

### Choose Chat Provider

Select one or more AI platforms to initialize with your context and prompt.

### Interact

The extension opens or activates browser tabs with the selected providers, automatically sending your context and prompt.

### Apply changes

After getting response from the AI platform, you can use the [Apply Changes](/docs/usage/applying-changes.html) feature to integrate the suggested changes into your code.

## Supported Chats

Gemini Coder integrates with numerous AI platforms:

- **AI Studio**: Google's developer platform for Gemini models
- **Gemini**: Google's consumer AI platform
- **ChatGPT**: OpenAI's chat platform
- **Claude**: Anthropic's AI assistant
- **GitHub Copilot**: Microsoft's AI programming assistant
- **Grok**: xAI's conversational AI
- **DeepSeek**: AI research platform
- **Mistral**: Mistral AI's platform
- **Open WebUI**: Self-hosted interface for various models

## Presets

The extension allows you to create presets of web chat configuration for different use cases.

Each preset can include:

- Target platform (ChatGPT, Gemini, Claude, etc.)
- Prompt prefix/suffix
- Model selection (for supported platforms)
- Temperature setting
- Custom system instructions

## Browser Extension

The [browser extension](/docs/installation.html#browser-extension) establishes a WebSocket connection with VS Code, allowing the direct launching of chat sessions with your selected context and prompt.

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
