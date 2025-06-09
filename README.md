<div align="center">
  <img src="https://raw.githubusercontent.com/robertpiosik/CodeWebChat/refs/heads/master/packages/vscode/media/logo.png" alt="logo" width="128" />
  <br />
  <h1>Code Web Chat</h1>
  <strong>👉 Select context, ask anything and initialize chatbots hands-free!</strong>
  <br />
  <strong>👉 Apply chat responses in truncated, whole or diff edit formats</strong>
  <br />
  <strong>👉 API tools for code completions, refactorings and commit messages</strong>
  <br />
  <br />
   <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Download-VS_Code_Marketplace-blue" alt="Download from Visual Studio Code Marketplace" /></a>&nbsp;<a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-blue" alt="Download from Visual Studio Code Marketplace" /></a>&nbsp;<a href="https://github.com/robertpiosik/CodeWebChat" target="_blank"><img src="https://img.shields.io/github/stars/robertpiosik/CodeWebChat" alt="stars" /></a><br /><a href="https://x.com/robertpiosik" target="_blank"><img src="https://img.shields.io/badge/Created_by-@robertpiosik-black?logo=x" alt="X" /></a>&nbsp;<a href="https://x.com/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Follow-@CodeWebChat-black?logo=x" alt="X" /></a>&nbsp;<a href="https://www.reddit.com/r/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Join-r%2FCodeWebChat-orange?logo=reddit&logoColor=white" alt="Join r/CodeWebChat" /></a><br />
   <a href="https://codeweb.chat/" target="_blank"><strong>Documentation</strong></a>
</div>

<br/>

<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/flow.png" alt="Flow" />

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">What is CWC?</span>

CWC is a non-agentic coding tool for AI-assisted programming built by an independent developer.

🧩 Works with VS Code and its derivatives (e.g., Cursor, Windsurf)<br />
✌️ 100% free and open source!

**Guiding Principles:**

- initialize popular chatbots—but don't game them
- API tools—battle-tested must-haves
- respect privacy—zero tracking
- lightweight—under 2MB

**CWC is for you if:**

- you're an experienced engineer working on a large codebase
- you're a student or hobbyist who thrives on the intricate aspects of coding
- you love open source software! 🫶

<p><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" /></p>

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Context</span>

While coding agents are
Other tools try to "guess" what pieces of the codebase matter for the given task, often struggling to get it right. They workaround this by overloading context or making excessive number of API calls.

CWC works differently:

- **You select** which folders and files are relevant to the task
- **You know** exactly how many tokens you have in the context

The result? Unmatched in accuracy and cost AI assistance.

> Too many tokens fighting for attention may _decrease_ performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Chatbot initialization</span>

Code with your favorite chatbot without tedious copy-pasting and apply responses with a single click.

### Supported chatbots

**AI Studio**, **ChatGPT**, **Claude**, **DeepSeek**, **Doubao**, **Gemini**, **Grok**, **HuggingChat**, **Mistral**, **Open WebUI**, **OpenRouter Chat**, **Qwen**, **Yuanbao**

The Connector extension is available in [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp) and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/).

> <small>**Legal Disclaimer:** After chat initialization, the extension does not read the incoming message. The injected _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

**TIP: Practice single-turn interactions**

Chat conversations are only a construct of product interfaces, they hurt the quality of responses from the model and once your context is "poisoned" it won't recover. Whenever you're not satisfied with a reponse, **the best practice is to alawys refine your initial instructions and reinitialize**.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">API Tools</span>

CWC will elevate your workflow with battle-tested must-have API tools.

### Code Completions

The best quality inline suggestions at the cost of latency. Designed to be used on demand.

✓ Includes selected context<br />
✓ Works with any model

### Refactoring

Modify files based on natural language instructions.

✓ Includes selected context<br />
✓ Multi-file updates in a single API call<br />
✓ Efficient in output tokens—requests diffs

### Intelligent Update

Update files based on code blocks in truncated edit format and fix malformed diffs.

✓ Regenerates whole files in concurrent API calls<br />
✓ Smaller models like Gemini Flash are sufficient

### Commit Messages

Generate meaningful commit messages precisely adhering to your preferred style.

✓ Includes affected files in full<br />
✓ Customizable instructions

### Predefined providers

**Anthropic**, **Cerebras**, **Chutes**, **DeepInfra**, **DeepSeek**, **Fireworks**, **Gemini**, **Hyperbolic**, **Mistral**, **OpenAI**, **OpenRouter**, **TogetherAI**

ℹ️ Any OpenAI-API compatible endpoint works with CWC<br />
🔒️ API keys are [stored encrypted](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Commands</span>

### Code completions

- `Code Web Chat: Code Completion` - Get inline autocompletion at the cursor position.
- `Code Web Chat: Code Completion with Suggestions` - Get inline autocompletion at the cursor position that follows given suggestions.
- `Code Web Chat: Code Completion to Clipboard` - Copy inline autocompletion prompt to clipboard.
- `Code Web Chat: Code Completion with Suggestions to Clipboard` - Copy inline autocompletion with suggestions prompt to clipboard.
- `Code Web Chat: Code Completion in Chat` - Use chatbot for code completion.
- `Code Web Chat: Code Completion in Chat with...` - Use chatbot for code completion with selected preset.

### Refactoring

- `Code Web Chat: Refactor` - Modify files based on natural language instructions.

### Applying chat responses

- `Code Web Chat: Apply Chat Response` - Apply changes suggested by AI using clipboard content of an overall chat response or a single code block.
- `Code Web Chat: Revert Last Applied Changes` - Revert the last applied changes.

### Chat

- `Code Web Chat: Chat` - Open chatbot with default preset.
- `Code Web Chat: Chat using...` - Open chatbot with preset selection.
- `Code Web Chat: Chat to Clipboard` - Enter instructions and copy to clipboard.

### Context

- `Code Web Chat: Copy Context` - Copy selected folders/files and websites to clipboard.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Community</span>

Please be welcomed in [discussions](https://github.com/robertpiosik/CodeWebChat/discussions) and in our subreddit [/r/CodeWebChat](https://www.reddit.com/r/CodeWebChat).

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Donations</span>

If you find CWC helpful, please consider a [donation](https://buymeacoffee.com/robertpiosik). Thank you!

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te<br />
**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R<br />
**LTC**: ltc1qcpmwsj2wm8hp7nw8jjsjuj5r3x9ggur052wkcx<br />
**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Contributing</span>

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">License</span>

Copyright © 2025-present [Robert Piosik](https://x.com/robertpiosik)
<br />📨 robertpiosik@gmail.com
<br />📱 Telegram: @robertpiosik
<br />📃 [GPL-3.0 license](https://github.com/robertpiosik/CodeWebChat/blob/master/LICENSE)
