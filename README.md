<div >
  <img src="https://raw.githubusercontent.com/robertpiosik/CodeWebChat/refs/heads/master/packages/vscode/media/logo.png" alt="logo" width="60">
  <br/>
  <h1>Code Web Chat</h1>
  <h4 style="line-height: 1.8">
  ★ Copy selected folders and files for web chats or initialize them hands-free!
  <br/>
  ★ Use the same context for quality code completions and file refactorings
  </h4>

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder"><img src="https://img.shields.io/badge/Download-VS_Code_Marketplace-blue" alt="Download from Visual Studio Code Marketplace"></a>
<a href="https://x.com/CodeWebChat"><img src="https://img.shields.io/badge/Follow-@CodeWebChat-black?logo=x&amp;logoColor=white" alt="X"></a>
<br/>

</div>

<a href="https://codeweb.chat/">Documentation</a>

Non-agentic 100% free & open source coding tool for AI-assisted programming.

All manually selected folders and files are fully attached with chats, code completions and file refactorings. Code Web Chat initializes AI Studio, Gemini and 10+ other popular chatbots, hands-free. Whenever you're happy with a chat response, integrate it with the codebase with a single click.

Code Web Chat is for you if:

- you're an experienced developer working on a large codebase
- coding agents failed you too many times
- student or hobbyist on a budget

<br/>

<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/walkthrough.gif" alt="Walkthrough" />

<br/>

## Overview

- Intuitive context selection
- Web chat initialization
- Chat response integration
- Code completions with any model
- Effective file refactoring
- Not limited to Gemini
- Any website in context
- Commit message generation
- Totally free
- Does not track usage
- Lightweight ~1.3MB

## You own the context

Other tools try to "guess" what pieces of the codebase matter for the given task, often struggling to get it right. They workaround this problem by overloading context with excessive information, hurting model's performance and your wallet.

Code Web Chat works differently:

- **You select** which folders and files are relevant to the task
- **You decide** what examples of coding conventions will work best
- **You know** exactly how much tokens you have in the context

The result? Unmatched in cost, speed and accuracy AI assistance.

> Too many tokens fighting for attention may _decrease_ performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

## Web chats

As everyone have their own favourite web chat interface, each with unique features and feel not feasible to integrate within the editor, Code Web Chat have you covered by initializing Gemini, AI Studio and many other popular chatbots with your context, instructions and settings, hands-free!

**You can start chats in one of two modes:**

- Ask anything
- Ask for code completion

**_Apply Chat Response_** is a smart tool that automatically integrates chat responses with the codebase, either replacing original files ("whole" code blocks) or refactoring with API (truncated code blocks).

**Supported chatbots: (alphabetically)**

- AI Studio
- ChatGPT
- Claude
- DeepSeek
- Gemini
- Grok
- HuggingChat
- Mistral
- Open WebUI (self-hosted)
- OpenRouter Chat
- Qwen
- Yuanbao

The Connector extension is available in [Chrome Web Store](https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp) and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/).

> <small>**Legal Disclaimer:** After chat initialization, the extension does not read the incoming message. The injected _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

## 🧰 Tools

Support your day-to-day work with all must-have AI features.

**Bring your own API keys for:**

- Gemini API
- OpenRouter

<small>
API keys are stored locally on your computer and all requests are sent directly to the provider.
</small>

#### 🛠️ Code completions

Use any model for accurate code completions. The tool attaches selected context in each request.

#### 🛠️ File refactoring

Modify the active file based on natural language instructions. The tool attaches selected context in each request.

#### 🛠️ Apply chat response

Automatically integrate chat responses with your codebase. The tool detects whether the clipboard contains complete files (replaces them directly), diffs or truncated files with ellipsis commments, e.g. "// ..." (applies them intelligently).

#### 🛠️ Commit messages

Generate meaningful commit messages based on contents of affected files and diffs of changes.

## Quick start for chat

1. Open the new Code Web Chat view from the activity bar (sparkles icon).
2. Select folders and files to include in the context.
3. Enter instructions and copy generated prompt.
4. (optional) Install [browser integration](https://gemini-coder.netlify.app/docs/installation/web-browser-integration) for hands-free initializations.

## Quick start for code completions

1. Open the new Code Web Chat view from the activity bar (sparkles icon).
2. Select folders and files to include in the context.
3. Place caret where you want code completion to appear.
4. Use Command Palette (Ctrl/Cmd + Shift + P) and type "Code Completion".
5. Bind the command to a keyboard shortcut by opening Keyboard Shortcuts (Ctrl/Cmd+K Ctrl/Cmd+S), searching for `Code Web Chat: Code Completion`, clicking the + icon, and pressing your preferred key combination (e.g. Ctrl/Cmd+I).

## Commands

#### Code completions

- `Code Web Chat: Code Completion` - Get code completion.
- `Code Web Chat: Code Completion with Suggestions` - Get code completion that follows given suggestions.
- `Code Web Chat: Code Completion to Clipboard` - Copy code completion prompt to clipboard.
- `Code Web Chat: Code Completion with Suggestions to Clipboard` - Copy code completion with suggestions prompt to clipboard.
- `Code Web Chat: Code Completion in Chat` - Send code completion prompt to web chat using default preset.
- `Code Web Chat: Code Completion in Chat with...` - Send code completion prompt to web chat with preset selection.

#### Refactoring

- `Code Web Chat: Refactor` - Refactor active editor.
- `Code Web Chat: Refactor to Clipboard` - Copy refactoring prompt to clipboard.

#### Applying chat responses

- `Code Web Chat: Apply Chat Response` - Apply changes suggested by AI using clipboard content.
- `Code Web Chat: Apply Chat Response (Fast replace)` - Apply changes suggested by AI using clipboard content (Fast replace).
- `Code Web Chat: Apply Chat Response (Intelligent update)` - Apply changes suggested by AI using clipboard content (Intelligent update).
- `Code Web Chat: Revert Last Applied Changes` - Revert the last applied changes.

#### Chat

- `Code Web Chat: Web Chat` - Open web chat with default preset.
- `Code Web Chat: Web Chat with...` - Open web chat with preset selection.
- `Code Web Chat: Chat to Clipboard` - Enter instructions and copy to clipboard.

#### Context

- `Code Web Chat: Copy Context` - Copy selected folders/files and websites to clipboard.

## Contributing

All contributions are welcome. Feel free to submit pull requests or create issues and discussions.

## Donations

If you find Code Web Chat helpful, please consider a [donation](https://buymeacoffee.com/robertpiosik). Thank you 🙏

XMR: 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## License

Copyright ©️ 2025 [Robert Piosik](https://x.com/robertpiosik).
</br>📨 `robertpiosik[at]gmail.com`
</br>📃 [MIT License](https://github.com/robertpiosik/CodeWebChat/blob/master/LICENSE)
