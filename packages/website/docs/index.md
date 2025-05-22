---
sidebar_position: 1
title: Intro
hide_title: true
---

<div align="center">
  <img src="https://raw.githubusercontent.com/robertpiosik/CodeWebChat/refs/heads/master/packages/vscode/media/logo.png" alt="logo" width="128" />
  <br/>
  <h1>Code Web Chat</h1>
  <strong>👉 Select context, ask anything and initialize any web chat hands-free!</strong>
  <br/>
  <strong>👉 Apply chat responses in truncated, whole or diff edit formats</strong>
  <br/>
  <strong>👉 Use any model for quality code completions and file refactorings</strong>
  <br/>
  <strong>👉 Generate meaningful commit messages</strong>
  <br/>
  <br/>
  <p>
  <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Download-VS_Code_Marketplace-blue" alt="Download from Visual Studio Code Marketplace" /></a>&nbsp;<a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-blue" alt="Download from Visual Studio Code Marketplace" /></a>&nbsp;<a href="https://github.com/robertpiosik/CodeWebChat" target="_blank"><img src="https://img.shields.io/github/stars/robertpiosik/CodeWebChat" alt="stars" /></a><br/><a href="https://x.com/robertpiosik" target="_blank"><img src="https://img.shields.io/badge/Created_by-@robertpiosik-black?logo=x" alt="X" /></a>&nbsp;<a href="https://x.com/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Follow-@CodeWebChat-black?logo=x" alt="X" /></a>&nbsp;<a href="https://www.reddit.com/r/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Join-r%2FCodeWebChat-orange?logo=reddit&logoColor=white" alt="Join r/CodeWebChat" /></a><br/>
  <strong><a href="https://codeweb.chat/">Documentation</a></strong>
  </p>
</div>

## What is CWC?

CWC is a non-agentic 100% free & open source VS Code extension for AI-assisted programming.

Guiding Principles:

- initialize all popular chatbots
- don't overengineer AI-assistance
- never collect any usage data
- be robust and lightweight (~1 MB)

CWC is for you if:

- you want the best performance out of LLMs
- you want to code with your favourite chatbot
- you love open source software! 🫶

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/walkthrough.gif" alt="Walkthrough" />
</p>

## You own the context

Other tools try to "guess" what pieces of the codebase matter for the given task, often struggling to get it right. They workaround this problem by overloading context with excessive information, hurting model's performance and your wallet.

CWC works differently:

- **You select** which folders and files are relevant to the task
- **You decide** what examples of coding conventions will work best
- **You know** exactly how much tokens you have in the context

The result? Unmatched in cost, speed and accuracy AI assistance.

> Too many tokens fighting for attention may _decrease_ performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

## Web chats

As everyone have their own favorite chatbot, each with unique capabilities, CWC lets you initialize them hands-free!

**The feature has two modes:**

- General - select context and type instructions
- Code Completions - select context and place cursor

Generated prompts are simple and adjustable.

**_Apply Chat Response_** is a smart tool that automatically integrates chat responses with the codebase, either refactoring with API ("Truncated" edit format), replacing original files in place ("Whole" edit format) or patching with diffs ("Diff" edit format).

**Supported chatbots: _(alphabetically)_**

- AI Studio
- ChatGPT
- Claude
- DeepSeek
- Doubao
- Gemini
- Grok
- HuggingChat
- Mistral
- Open WebUI
- OpenRouter Chat
- Qwen
- Yuanbao

The Connector extension is available in [Chrome Web Store](https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp) and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/).

> <small>**Legal Disclaimer:** After chat initialization, the extension does not read the incoming message. The injected _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

### Practice single-turns

Chat conversations are only a construct of product interfaces, they hurt the quality of responses from the model and once your context is "poisoned" it will not recover. Whenever you're not satisfied with a reponse, **the best practice is to alawys refine your initial instructions and re-initialize**.

## 🧰 Tools

CWC will elevate your coding with battle-tested, must have API features.

### 🛠️ Code completions

Use state-of-the-art reasoning models for accurate code completions. Selected context is included with every request.

### 🛠️ File refactoring

Modify the active file based on natural language instructions. Selected context is included with every request.

### 🛠️ Apply chat response

Automatically integrate chat responses with your codebase. The tool detects whether the clipboard-held chat response contains complete files (replaces them), diffs (possible fallback with the file refactoring tool without context) or truncated fragments (always uses file refactoring tool without context).

### 🛠️ Commit messages

Generate meaningful commit messages based on contents of affected files and diffs of changes.

### 🔑 Bring your own API keys

**Predefined providers: _(alphabetically)_**

- Anthropic
- Cerebras
- Chutes
- DeepInfra
- DeepSeek
- Fireworks
- Gemini
- Hyperbolic
- Mistral
- OpenAI
- OpenRouter
- TogetherAI

ℹ️ Any OpenAI-API compatible endpoint works with CWC.<br/>
🔒️ API keys are stored securely in the [Secret Storage](https://code.visualstudio.com/api/references/vscode-api#SecretStorage).

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
- `Code Web Chat: Revert Last Applied Changes` - Revert the last applied changes.

#### Chat

- `Code Web Chat: Web Chat` - Open web chat with default preset.
- `Code Web Chat: Web Chat with...` - Open web chat with preset selection.
- `Code Web Chat: Chat to Clipboard` - Enter instructions and copy to clipboard.

#### Context

- `Code Web Chat: Copy Context` - Copy selected folders/files and websites to clipboard.

## Community

Please be welcomed in [discussions](https://github.com/robertpiosik/CodeWebChat/discussions) and in our subreddit [/r/CodeWebChat](https://www.reddit.com/r/CodeWebChat).

## Donations

If you find CWC helpful, please consider buying the author a [coffee](https://buymeacoffee.com/robertpiosik). Thank you for your support! 🙏

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**LTC**: ltc1qcpmwsj2wm8hp7nw8jjsjuj5r3x9ggur052wkcx

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## Contributing

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

## License

Copyright © 2025-present [Robert Piosik](https://x.com/robertpiosik)
<br/>📨 `robertpiosik@gmail.com`
<br/>Telegram: `@robertpiosik`
<br/>📃 [GPL-3.0 license](https://github.com/robertpiosik/CodeWebChat/blob/master/LICENSE)
