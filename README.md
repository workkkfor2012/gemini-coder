<div style="text-align: center">
    <img src="https://raw.githubusercontent.com/robertpiosik/gemini-coder/refs/heads/master/packages/vscode/media/logo.png" alt="logo" width="125">
  <br>
  <h1>Gemini Coder</h1>
  <h3>The 2M context AI coding assistant</h3>
  <br>
  <a href="https://gemini-coder.netlify.app/">Documentation</a>
  <br>
  <br>
</div>

# Introduction

Gemini Coder is an all-in-one, universal, free and open-source AI coding assistant with first class support for AI Studio and Gemini API.

The extension lets you granularly pick context and initalize chats in the web browser, hands-free! Use the same context using powerful API features: Fill-In-the-Middle (FIM) completions and file refactoring. To integrate AI suggested modifications to any file with a single click copy them and hit _Apply changes_ ✨.

## Own the context

Other AI coding tools try to "guess" what context matters, often getting it wrong. Gemini Coder works differently:

- **You select** which folders/files provide relevant context
- **You control** what examples of coding conventions to include
- **You know** how much tokens is used with API calls and web chats at any moment

The result? Unmatched in accuracy, speed and cost AI assistance.

## Features

- Use [your own API key](https://aistudio.google.com/app/apikey) with built-in Gemini models for [FIM completions](https://gemini-coder.netlify.app/docs/features/fim), [file refactoring](https://gemini-coder.netlify.app/docs/features/refactor) and [applying AI suggested changes](https://gemini-coder.netlify.app/docs/features/apply-changes).
- Configure additional OpenAI API compatible AI providers.
- Full control over [context](https://gemini-coder.netlify.app/docs/context) sent in API requests and chats.
- Initialize web chats hands-free. [Web browser integration](https://gemini-coder.netlify.app/docs/installation/web-browser-integration) supports all popular chatbots:
  - [AI Studio](https://aistudio.google.com/app/prompts/new_chat)
  - [Gemini](https://gemini.google.com/app)
  - [ChatGPT](https://chatgpt.com/)
  - [Claude](https://claude.ai/new)
  - [GitHub Copilot](https://github.com/copilot)
  - [Grok](https://grok.com/)
  - [DeepSeek](https://chat.deepseek.com/)
  - [Mistral](https://chat.mistral.ai/chat)
  - Open WebUI (localhost)

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
- `Gemini Coder: Chat to Clipboard` - Copy chat prompt (context and instructions) to clipboard

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

## License

Copyright (c) 2025 [Robert Piosik](https://buymeacoffee.com/robertpiosik). MIT License.
