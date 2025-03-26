<div align="center">
    <img src="https://raw.githubusercontent.com/robertpiosik/gemini-coder/refs/heads/master/packages/vscode/media/logo.png" alt="logo" width="60">
  <br/>
  <h1>Gemini Coder</h1>
  <h2>The free 2M context AI coding assistant</h2>
  <h4>Copy folders and files for chatbots or initialize them hands-free!<br/>
  Use the free Gemini API for FIM completions, file refactoring and applying AI-suggested changes.</h4>
  <br/>

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder"><img src="https://img.shields.io/badge/Download-VS_Code_Marketplace-blue" alt="Download from Visual Studio Code Marketplace"></a>
<a href="https://open-vsx.org/extension/robertpiosik/gemini-coder"><img src="https://img.shields.io/badge/Download-Open_VSX_Registry-blue" alt="Download from Open VSX Registry"></a>
<br/>
<a href="https://x.com/intent/follow?screen_name=robertpiosik"><img src="https://img.shields.io/badge/Follow-black?logo=x&amp;logoColor=white" alt="X"></a>
<a href="https://www.buymeacoffee.com/robertpiosik"><img src="https://img.shields.io/badge/Donate-Buy_me_a_coffee-green.svg" alt="Buy Me A Coffee"></a>
<img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License">
<br/>
<br/>
<a href="https://gemini-coder.netlify.app/">Documentation</a>
<br/>
<br/>

</div>

Gemini Coder lets you conveniently copy folders and files for chatbots. With our browser extension you can initalize them hands-free!

The extension uses the same context for built-in API features: **Fill-In-the-Middle (FIM) completions** and **file refactoring**. Hit **apply changes** to integrate AI responses with your codebase with just a single click.

- **100% free & open source:** MIT License
- **Versitale:** Not limited to Gemini or AI Studio
- **Private:** Does not collect any usage data
- **Local:** Talks with the web browser via WebSockets
- **One of a kind**: Lets you use any website for context
- **Lightweight:** Unpacked build is just ~1MB

<br/>

<img src="https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/shared/src/media/walkthrough.gif" alt="Walkthrough" />

<br/>

## You own the context

Other AI coding tools try to "guess" what context matters, often getting it wrong. Gemini Coder works differently:

- **You select** which folders and files provide relevant context
- **You control** what examples of coding conventions to include
- **You know** how much tokens is used in web chats and FIM/refactoring requests

The result? Unmatched in accuracy, speed and cost AI assistance.

> Too many tokens fighting for attention may _decrease_ performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

## Supported chatbots

Gemini Coder works with many popular chatbots:

- **AI Studio**
- **Gemini**
- ChatGPT
- Claude
- GitHub Copilot
- Grok
- DeepSeek
- Mistral
- HuggingChat
- Open WebUI (localhost)

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

- `Gemini Coder: Apply Changes` - Apply changes suggested by AI using clipboard content
- `Gemini Coder: Apply Changes with...` - Apply changes with model selection
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
