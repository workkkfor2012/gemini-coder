<div align="center">
    <img src="https://raw.githubusercontent.com/robertpiosik/gemini-coder/refs/heads/master/packages/vscode/media/logo.png" alt="logo" width="60">
  <br/>
  <h1>Gemini Coder - free AI coding</h1>
  <h4>Copy folders and files for chatbots or initialize them hands-free!<br/>
  Use built-in API Tools for code completions, file refactoring and applying chat responses.</h4>
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

Non-agentic 100% free & open source coding tool for AI-assisted programming.

All manually selected folders and files are always attached as context with all your web chats, code completions and file refactoring API requests. If you prefer working on your code with web-based chatbots, Gemini Coder is for you. It initializes Gemini and 10+ other AI platforms hands-free.

What will you ship today?

Not affiliated with Google.

<br/>

<img src="https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/shared/src/media/walkthrough.gif" alt="Walkthrough" />

<br/>

- MIT License
- Intuitive context selection
- Initializes web chats
- Not limited to Gemini
- Code completions with any model
- Handles truncated chat reponses
- Include websites in context
- Does not collect usage data
- Lightweight, just ~1.3MB

## You own the context

Other AI coding tools try to "guess" what context matters, often getting it wrong. Gemini Coder works differently:

- **You select** which folders and files provide relevant context
- **You control** what examples of coding conventions to include
- **You know** how much tokens are used in web chats and code completion/file refactoring requests

The result? Unmatched in accuracy, speed and cost AI assistance.

> Too many tokens fighting for attention may _decrease_ performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

## Supported chatbots

Gemini Coder initializes many popular chatbots hands-free.

- **Gemini**
- AI Studio
- OpenRouter Chat
- Open WebUI (self-hosted)
- ChatGPT
- Claude
- Grok
- DeepSeek
- Mistral
- GitHub Copilot
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

## Commands

#### Code completions

- `Gemini Coder: Code Completion` - Get code completion.
- `Gemini Coder: Code Completion with Suggestions` - Get code completion that follows given suggestions.
- `Gemini Coder: Code Completion to Clipboard` - Copy code completion prompt to clipboard.
- `Gemini Coder: Code Completion with Suggestions to Clipboard` - Copy code completion with suggestions prompt to clipboard.
- `Gemini Coder: Code Completion in Chat` - Send code completion prompt to web chat using default preset.
- `Gemini Coder: Code Completion in Chat with...` - Send code completion prompt to web chat with preset selection.

#### Refactoring

- `Gemini Coder: Refactor` - Refactor active editor.
- `Gemini Coder: Refactor to Clipboard` - Copy refactoring prompt to clipboard.

#### Applying chat responses

- `Gemini Coder: Apply Chat Response` - Apply changes suggested by AI using clipboard content.
- `Gemini Coder: Apply Chat Response (Fast replace)` - Apply changes suggested by AI using clipboard content (Fast replace).
- `Gemini Coder: Apply Chat Response (Intelligent update)` - Apply changes suggested by AI using clipboard content (Intelligent update).
- `Gemini Coder: Revert Last Applied Changes` - Revert the last applied changes.

#### Chat

- `Gemini Coder: Web Chat` - Open web chat with default preset.
- `Gemini Coder: Web Chat with...` - Open web chat with preset selection.
- `Gemini Coder: Chat to Clipboard` - Enter instructions and copy to clipboard.

#### Context

- `Gemini Coder: Copy Context` - Copy selected folders/files and websites to clipboard.

## Contributing

All contributions are welcome. Feel free to submit pull requests or create issues and discussions.

## License

Copyright (c) 2025 [Robert Piosik](https://buymeacoffee.com/robertpiosik). MIT License.
