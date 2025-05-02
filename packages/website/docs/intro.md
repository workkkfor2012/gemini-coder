---
sidebar_position: 1
hide_table_of_contents: true
---

# Introduction

Non-agentic 100% free & open source coding tool for AI-assisted programming.

All manually selected folders and files are always attached in context for chats, code completions and file refactorings. Gemini Coder initializes Gemini, AI Studio and 10+ other chatbots, hands-free. Whenever you're happy with a chat response, integrate it with the codebase with a single click.

Gemini Coder is for you if:

- you're an experienced developer working on a large codebase
- coding agents failed you too many times
- student or hobbyist on a budget

Not affiliated with Google.

<br/>

<img src="https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/shared/src/media/walkthrough.gif" alt="Walkthrough" />

<br/>

## Overview

- MIT License
- Totally free
- Intuitive context selection
- Initializes web chats
- Not limited to Gemini
- Code completions with any model
- Integrate chat reponses
- Include websites in context
- Generate commit messages
- Does not collect usage data
- Lightweight ~1.3MB

## You own the context

Other AI coding tools try to "guess" what context matters, often getting it wrong. Gemini Coder works differently:

- **You select** which folders and files are relevant to the task
- **You choose** what examples outside of the task to include to point the model in the right direction
- **You know** exactly how much tokens you have in the context

The result? Unmatched in accuracy and cost AI assistance.

> Too many tokens fighting for attention may _decrease_ performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

## Web chats

As everyone have their own favourite chat interface, each with unique features and feel, Gemini Coder have you covered by initializing all of the most popular ones with your context and instructions, hands-free!

We're commited to ensure continous and the most thorough support for:

- Gemini
- AI Studio
- OpenRouter Chat
- Open WebUI (self-hosted)

While many more chatbots are supported as well:

- ChatGPT
- Claude
- Grok
- DeepSeek
- Mistral
- GitHub Copilot
- HuggingChat

Available in [Chrome Web Store](https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp) and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/).

> <small>**Legal Disclaimer:** After chat initialization, the extension does not read the incoming message, nor does it take any other action. The injected _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

## 🧰 API Tools

Supported providers: **Gemini API**, **OpenRouter**.

#### 🛠️ Code completions

Use state-of-the-art models for top-quality code completions. The tool attaches selected context in each request.

#### 🛠️ File refactoring

Modify the active file based on natural language instructions. The tool attaches selected context in each request.

#### 🛠️ Apply Chat Response

Automatically integrate copied chat response with the codebase. To correctly detect target files, the tool expects code blocks to have file paths in first-line comments. The tool makes concurrent API calls for each modified file when code blocks have truncation comments, e.g. "// ...", otherwise files are replaced in place.

#### 🛠️ Commit messages

Generate meaningful commit messages based on fully attached affected files and diffs of changes.

## Quick start for chat

1. Open the new Gemini Coder view from the activity bar (sparkles icon).
2. Select folders and files to include in the context.
3. Enter instructions and copy generated prompt.
4. (optional) Install [browser integration](https://gemini-coder.netlify.app/docs/installation/web-browser-integration) for hands-free initializations.

## Quick start for code completions

1. Open the new Gemini Coder view from the activity bar (sparkles icon).
2. Select folders and files to include in the context.
3. Place caret where you want code completion to appear.
4. Use Command Palette (Ctrl/Cmd + Shift + P) and type "Code Completion".
5. Bind the command to a keyboard shortcut by opening Keyboard Shortcuts (Ctrl/Cmd+K Ctrl/Cmd+S), searching for `Gemini Coder: Code Completion`, clicking the + icon, and pressing your preferred key combination (e.g. Ctrl/Cmd+I).
