---
sidebar_position: 1
hide_table_of_contents: true
---

# Introduction

Gemini Coder lets you conveniently copy folders and files for chatbots. With the Connector browser extension you can initalize them hands-free!

The extension uses the same context for built-in API tools: **code completions** and **file refactoring**. Hit **apply chat response** to integrate multi-file updates with just a single click.

<img src="https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/shared/src/media/walkthrough.gif" alt="Walkthrough" />

<br/><br/>

- **100% free & open source:** MIT License
- **Explorer view:** Intuitive context selection
- **Versitale:** Initializes all major chatbots
- **API Tools with your keys**: Gemini API or OpenRouter
- **Private:** Does not collect any usage data
- **Local:** WebSockets for local browser communication
- **One of a kind**: Include websites in context
- **Lightweight:** Unpacked build is just ~1.3MB

## You own the context

Other AI coding tools try to "guess" what context matters, often getting it wrong. Gemini Coder works differently:

- **You select** which folders and files provide relevant context
- **You control** what examples of coding conventions to include
- **You know** how much tokens are used in web chats and code completion/file refactoring requests

The result? Unmatched in accuracy, speed and cost AI assistance.

> Too many tokens fighting for attention may _decrease_ performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

## Supported chatbots

Gemini Coder initializes many popular chatbots hands-free.

Fully supported chatbots, with system instructions, temperature, model selection and automatic response applying:

- **AI Studio**
- **OpenRouter Chat**
- **Open WebUI (self-hosted)**

Other supported chatbots:

- Gemini
- ChatGPT
- Claude
- GitHub Copilot
- Grok
- DeepSeek
- Mistral
- HuggingChat

## Quick start for chat

1. Open the new Gemini Coder view from the activity bar (sparkles icon).
2. Select folders and files to include in the context.
3. Enter instructions and copy generated prompt.
4. (optional) Install [browser integration](https://gemini-coder.netlify.app/docs/installation/web-browser-integration) for hands-free web chats initializations.

## Quick start for code completions

1. Open the new Gemini Coder view from the activity bar (sparkles icon).
2. Select folders and files to include in the context.
3. Place caret where you want code completion to appear.
4. Use Command Palette (Ctrl/Cmd + Shift + P) and type "Code Completion".
5. Bind the command to a keyboard shortcut by opening Keyboard Shortcuts (Ctrl/Cmd+K Ctrl/Cmd+S), searching for `Gemini Coder: Code Completion`, clicking the + icon, and pressing your preferred key combination (e.g. Ctrl/Cmd+I).
