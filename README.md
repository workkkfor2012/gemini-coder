<h1 align="center">
  <br>
    <img src="https://github.com/user-attachments/assets/b36d5d8d-63b4-4008-91de-fb19c3a16405" alt="logo" width="150">
  <br>
  Stripe for Visual Studio Code
  <br>
  <br>
</h1>

<h4 align="center">Build, test, and use Stripe inside your editor.</h4>

Gemini Coder is an all-in-one, universal, free and open-source AI coding assistant with first class support for AI Studio and Gemini API.

The extension lets you granularly pick context and initalize chats in the web browser, hands-free! Use the same context using powerful API features: Fill-In-the-Middle (FIM) completions and file refactoring. To integrate AI suggested modifications to any file with a single click copy them and hit Apply changes ✨.

Supports all Gemini models with your own API key out of the box and all the other OpenAI API compatible providers.

The Connector browser extension supports all major chatbots: AI Studio, Gemini, ChatGPT, Claude, GitHub Copilot Mistral, DeepSeek and more.

[![ScreenCast](https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/vscode/resources/screencast.gif)]()

## Features

- Workspace explorer tree for context selection.
- Automatically initialized web chats in Gemini & AI Studio (and more).
- FIM completions at the cursor position.
- Applying suggested code changes.
- File refactoring with instruction.
- API provider agnostic, read more in "Set up custom providers" section below.
- Supports other web chats as well: ChatGPT, Claude, Github Copilot, DeepSeek, Open WebUI (self-hosted).
- Saved contexts for quick selection of file sets.

## How to use FIM completions

1.  Open the Context View and select all relevant folders/files you want to attach as context in each request.
2.  Place the cursor where you want to insert code completion.
3.  Open the Command Palette (`Ctrl+Shift+P`).
4.  Type `Gemini Coder: FIM Completion`.
5.  Bind command to a key combination of your choice in `Preferences: Open Keyboard Shortcuts`, e.g., `Ctrl+P` for `Gemini Coder: FIM Completion`.

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

#### Chat Interactions

- `Gemini Coder: Web Chat` - Open web chat with context
- `Gemini Coder: Chat to Clipboard` - Create chat content with context to clipboard

#### Context Management

- `Gemini Coder: Copy Context` - Copy selected files as XML context
- `Gemini Coder: Select Saved Context` - Apply a saved context from configuration

## Set up custom providers

The extension supports any OpenAI API compatible providers for FIM completions and applying changes to files.

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

Quickly restore checkbox states with saved contexts. You can configure them in `.vscode/gemini-coder.json` following the example below.

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

1. In the file tree's actions toolbar find icon "Select Saved Context".
2. Edit examples or select a saved context.
3. The selected files and folders will be automatically checked.

## License

Copyright (c) 2025, [Robert Piosik](https://buymeacoffee.com/robertpiosik). (MIT License)
