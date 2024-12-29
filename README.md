# Gemini Coder

## Description

Gemini Coder lets you use Gemini (in fact, all OpenAI API compatible providers, DeepSeek, Claude, ChatGPT, etc.) for Autocompletion (Fill in the middle <FIM>) and file refactoring.

**You decide what is sent to the model.** With a dedicated Context Panel, you can granularly select the context attached to each completion/refactoring request.

The extension also allows you to copy the context, autocompletion and file refactoring prompts to the clipboard, so you can comfortably switch between the editor and your favourite AI tool, like Gemini or AI Studio.

[![ScreenShot](resources/preview.png)]()

## Features

- Lightweight, 100% free, MIT licensed.
- Autocomplete at the cursor position.
- Refactor the current file.
- Manually set context for all requests.
- Copy context, autocompletion or file refactoring prompts to clipboard.
- Rate-limited Gemini Pro requests fall back to Gemini Flash.
- Use experimental models or other OpenAI-compatible providers.
- Copy autocompletion and refactoring prompts to the clipboard.
- Change default models via status bar.

## How to Use

1.  Open the Context View and select all relevant folders/files you want to attach as context in each completion request.
2.  Place the cursor where you want to insert code completion.
3.  Open the Command Palette (`Ctrl+Shift+P`).
4.  Run one of the following commands:
    - `Gemini Coder: Autocomplete with Primary Model`
    - `Gemini Coder: Autocomplete with Secondary Model`
    - `Gemini Coder: Refactor this file`
5.  You can also copy the prompt to the clipboard using:
    - `Gemini Coder: Copy Autocompletion Prompt to Clipboard`
    - `Gemini Coder: Copy File Refactoring Prompt to Clipboard`
6.  Change default models with command `Gemini Coder: Change Default Models`.
7.  Bind the commands to a key combination of your choice in `Preferences: Open Keyboard Shortcuts`, e.g., `Ctrl+P` for the Primary Model and `Alt+P` for the Secondary Model.

## Commands

- `Gemini Coder: Copy Context`: Copies the selected files' content to the clipboard.
- `Gemini Coder: Autocomplete with Primary Model`: Uses the primary model to autocomplete code at the cursor position.
- `Gemini Coder: Autocomplete with Secondary Model`: Uses the secondary model to autocomplete code at the cursor position.
- `Gemini Coder: Copy Autocompletion Prompt to Clipboard`: Copies the current autocompletion prompt to the clipboard.
- `Gemini Coder: Change Default Models`: Allows you to change the default primary and secondary models.
- `Gemini Coder: Refactor this file`: Refactors the current file based on the provided instruction.
- `Gemini Coder: Copy File Refactoring Prompt to Clipboard`: Copies the refactoring prompt to the clipboard.

## Set up custom models

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
  ],
```

## License

MIT

This is not an official Google product.
