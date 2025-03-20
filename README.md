<div align="center">
    <img src="https://raw.githubusercontent.com/robertpiosik/gemini-coder/refs/heads/master/packages/vscode/media/logo.png" alt="logo" width="60">
  <br>
  <h1>Gemini Coder</h1>
  <h4>Copy context for chatbots or initialize them hands-free. Use Fill-In-the-Middle and file refactoring with the selected context. Integrate AI suggested changes with a single click!</h4>
  <br>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License">
  <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder"><img src="https://img.shields.io/visual-studio-marketplace/i/robertpiosik.gemini-coder" alt="Installs"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder&ssr=false#review-details"><img src="https://img.shields.io/visual-studio-marketplace/r/robertpiosik.gemini-coder" alt="Rating"></a>
  <a href="https://www.buymeacoffee.com/robertpiosik"><img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-blue.svg" alt="Buy Me A Coffee"></a>
  <br>  
  <br>
  <a href="https://gemini-coder.netlify.app/">Documentation</a>
  <br>
  <br>
</div>

<img src="https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/shared/src/media/walkthrough.gif" alt="Walkthrough" />

## Introduction

The extension lets you granularly pick and copy context or **initalize chats in the web browser**, hands-free! Use the same context using powerful API features: **Fill-In-the-Middle (FIM)** completions and **file refactoring**. To integrate AI suggested modifications to any file with a single click, copy them and hit **Apply changes** ✨.

- Lets you do all the coding for free
- MIT license
- No usage tracking
- Lightweight (~1MB)
- Works with all VS Code based editors (Cursor, Windsurf, VSCodium, etc.)

## You own the context

Other AI coding tools try to "guess" what context matters, often getting it wrong. Gemini Coder works differently:

- **You select** which folders/files provide relevant context
- **You control** what examples of coding conventions to include
- **You know** how much tokens is used with API calls and web chats at any moment

The result? Unmatched in accuracy, speed and cost AI assistance.

## Features

- Hand-picking [context](https://gemini-coder.netlify.app/docs/context) for chatbots.
- Dedicated [web browser integration](https://gemini-coder.netlify.app/docs/installation/web-browser-integration) with support for:
  - **[AI Studio](https://aistudio.google.com/app/prompts/new_chat)**
  - **[Gemini](https://gemini.google.com/app)**
  - [ChatGPT](https://chatgpt.com/)
  - [Claude](https://claude.ai/new)
  - [GitHub Copilot](https://github.com/copilot)
  - [Grok](https://grok.com/)
  - [DeepSeek](https://chat.deepseek.com/)
  - [Mistral](https://chat.mistral.ai/chat)
  - Open WebUI (localhost)
- Presets for automatically prefixed and suffixed chat instructions, or specific model, temperature, system instructions and options, e.g. canvas set (support vary).
- Use [your own API key](https://aistudio.google.com/app/apikey) with built-in Gemini models for [FIM completions](https://gemini-coder.netlify.app/docs/features/fim), [file refactoring](https://gemini-coder.netlify.app/docs/features/refactor) and [applying AI suggested changes](https://gemini-coder.netlify.app/docs/features/apply-changes).
- Compatible with OpenAI API.

## Quick start for chat

1. Open the new Gemini Coder view from the activity bar (sparkles icon).
2. Select files/folders for the context.
3. Click copy icon from the toolbar.
4. (optional) Install [browser integration](https://gemini-coder.netlify.app/docs/installation/web-browser-integration) for hands-free initializations.

## Quick start for FIM completions

1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open VS Code and navigate to settings.
3. Search for "Gemini Coder" and paste your API key.
4. Use Command Palette (Ctrl/Cmd + Shift + P) and type "FIM Completion".
5. Bind the command to a keyboard shortcut by opening Keyboard Shortcuts (Ctrl/Cmd+K Ctrl/Cmd+S), searching for `Gemini Coder: FIM Completion`, clicking the + icon, and pressing your preferred key combination (e.g. Ctrl/Cmd+I).

## Commands

#### FIM Completions

- `Gemini Coder: FIM Completion` - Get fill-in-the-middle completion using default model
- `Gemini Coder: FIM Completion with...` - Get fill-in-the-middle completion with model selection
- `Gemini Coder: FIM Completion to Clipboard` - Copy FIM completion content to clipboard
- `Gemini Coder: Change Default FIM Model` - Change default AI model for FIM completions

#### Refactoring

- `Gemini Coder: Refactor this File` - Apply changes based on refactoring instruction
- `Gemini Coder: Refactor this File with...` - Refactor with model selection
- `Gemini Coder: Refactor to Clipboard` - Copy refactoring content to clipboard
- `Gemini Coder: Change Default Refactoring Model` - Change default AI model for refactoring

#### Applying Changes

- `Gemini Coder: Apply Changes to this File` - Apply changes suggested by AI using clipboard content
- `Gemini Coder: Apply Changes to this File with...` - Apply changes with model selection
- `Gemini Coder: Apply Changes to Clipboard` - Copy apply changes content to clipboard
- `Gemini Coder: Change Default Apply Changes Model` - Change default AI model for applying changes

#### Chat

- `Gemini Coder: Web Chat` - Enter instructions and open web chat hands-free
- `Gemini Coder: Chat to Clipboard` - Enter instructions and copy to clipboard

#### Context

- `Gemini Coder: Copy Context` - Copy selected files as XML context
- `Gemini Coder: Select Saved Context` - Restore checbox states in the workspace tree

## Set up custom providers

The extension supports OpenAI API compatible model providers for API actions.

```json
  "geminiCoder.providers": [
    {
      "name": "DeepSeek",
      "endpointUrl": "https://api.deepseek.com/v1/chat/completions",
      "bearerToken": "[API KEY]",
      "model": "deepseek-chat",
      "temperature": 0,
      "instruction": ""
    },
    {
      "name": "Mistral Large Latest",
      "endpointUrl": "https://api.mistral.ai/v1/chat/completions",
      "bearerToken": "[API KEY]",
      "model": "mistral-large-latest",
      "temperature": 0,
      "instruction": ""
    },
  ],
```

## Saved contexts

Quickly restore checkbox states. You can configure them creating `.vscode/gemini-coder.json` in the workspace root and following the example below.

```json
{
  "savedContexts": [
    {
      "name": "Backend only",
      "paths": ["packages/server/src"]
    },
    {
      "name": "Frontend only",
      "paths": ["packages/client/src"]
    }
  ]
}
```

To use saved contexts:

1. In the workspace view actions toolbar find discette icon.
2. Select a context.
3. Paths listed in the selected context are checked.

## Contributing

All contributions are welcome. Feel free to submit pull requests or create issues and discussions.

## License

Copyright (c) 2025 [Robert Piosik](https://buymeacoffee.com/robertpiosik). MIT License.
