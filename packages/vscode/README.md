# Gemini Coder

## Description

This unofficial extension allows you to use Gemini Pro and Gemini Flash models inside VS Code.

With dedicated context panel you can select related folders and files, up to 2M tokens, then use one of available commands for 

- FIM completions
- chat (AI Studio)
- file refactoring

For a seamless developer experience, install dedicated browser extension for hands-free chat initialization.

- [Install for Chrome](https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Install for Firefox](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/)

[![ScreenShot](https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/vscode/resources/preview.png)]()

## Features

- Light & fast.
- File tree for context selection.
- Autocomplete at the cursor position.
- Automatically initialized chats in AI Studio.
- File refactoring.
- Rate limited Gemini Pro requests fallback to Gemini Flash.
- Provider agnostic, use all the features with models and web chats of your choice.

## How to use FIM autocompletion

1.  Open the Context View and select all relevant folders/files you want to attach as context in each request.
2.  Place the cursor where you want to insert code completion.
3.  Open the Command Palette (`Ctrl+Shift+P`).
4.  Run one of the following commands (listed below).
5.  Bind commands to a key combination of your choice in `Preferences: Open Keyboard Shortcuts`, e.g., `Ctrl+P` for `Gemini Coder: Autocomplete with Primary Model` and `Alt+P` for `Gemini Coder: Autocomplete with Secondary Model`.

## Commands

- `Gemini Coder: Copy Context`: Copies the selected files' content to the clipboard.
- `Gemini Coder: Autocomplete with Primary Model`: Uses the primary model to autocomplete code at the cursor position.
- `Gemini Coder: Autocomplete with Secondary Model`: Uses the secondary model to autocomplete code at the cursor position.
- `Gemini Coder: Copy Autocompletion Prompt to Clipboard`: Copies the current autocompletion prompt to the clipboard.
- `Gemini Coder: Change Default Models`: Allows you to change the default primary and secondary models.
- `Gemini Coder: Refactor this file`: Refactors the current file based on the provided instruction.
- `Gemini Coder: Copy File Refactoring Prompt to Clipboard`: Copies the refactoring prompt to the clipboard.
- `Gemini Coder: Open Web Chat with instruction...`: Copies the instruction with context to the clipboard and opens the selected web chat.
- `Gemini Coder: Open Web Chat with Autocompletion Prompt`: Copies the current autocompletion prompt to the clipboard and opens the selected web chat.
- `Gemini Coder: Open Web Chat with file refactoring prompt...`: Copies the refactoring prompt to the clipboard and opens the selected web chat.

## Set up custom providers

```json
  "geminiCoder.providers": [
    // Gemini Experimental
    {
      "name": "Gemini Flash 2.0 Exp",
      "endpointUrl": "https://generativelanguage.googleapis.com/v1beta/chat/completions",
      "bearerToken": "[API KEY]",
      "model": "gemini-2.0-flash-exp",
      "temperature": 0,
      "instruction": ""
    },
    {
      "name": "Gemini Exp 1206",
      "endpointUrl": "https://generativelanguage.googleapis.com/v1beta/chat/completions",
      "bearerToken": "[API KEY]",
      "model": "gemini-exp-1206",
      "temperature": 0,
      "instruction": ""
    },
    // Others
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

## License

MIT

This is not an official Google product.

## Author

Robert Piosik, [follow on X](https://x.com/robertpiosik).