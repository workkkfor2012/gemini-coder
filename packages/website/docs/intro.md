---
sidebar_position: 1
hide_table_of_contents: true
---

# Introduction

The extension lets you conveniently pick folders and individual files and copy them for chatbots. With our browser extension you can initalize them hands-free!

Gemini Coder uses the same context for its essential API features: **Fill-In-the-Middle (FIM) completions** and **file refactoring**. Hit **apply changes** to integrate AI responses with your codebase with just one-click.

- **100% free & open source:** MIT License
- **Versitale:** Not limited to Gemini & AI Studio
- **Private:** Does not collect telemetry
- **Local:** Talks with the web browser via WebSockets
- **One of a kind**: Lets you use any website for context
- **Lightweight:** Unpacked build is just ~1MB

<img src="https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/shared/src/media/walkthrough.gif" alt="Walkthrough" />

## You own the context

> Too many tokens fighting for attention may _decrease_ performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

Other AI coding tools try to "guess" what context matters, often getting it wrong. Gemini Coder works differently:

- **You select** which folders/files provide relevant context
- **You control** what examples of coding conventions to include
- **You know** how much tokens is used with API calls and web chats at any moment

The result? Unmatched in accuracy, speed and cost AI assistance.

## Features

- Hand-picking [context](/docs/context) for chatbots and API features.
- Dedicated [web browser integration](/docs/installation/web-browser-integration) with support for:
  - **[AI Studio](https://aistudio.google.com/app/prompts/new_chat)**
  - **[Gemini](https://gemini.google.com/app)**
  - [ChatGPT](https://chatgpt.com/)
  - [Claude](https://claude.ai/new)
  - [GitHub Copilot](https://github.com/copilot)
  - [Grok](https://grok.com/)
  - [DeepSeek](https://chat.deepseek.com/)
  - [Mistral](https://chat.mistral.ai/chat)
  - Open WebUI (localhost)
- Special purpose chat configurations with presets.
- Use [your own API key](https://aistudio.google.com/app/apikey) with built-in Gemini models for [FIM completions](/docs/features/fim), [file refactoring](/docs/features/refactor) and [applying changes](/docs/features/apply-changes).
- Configure your favorite OpenAI API compatible providers.
