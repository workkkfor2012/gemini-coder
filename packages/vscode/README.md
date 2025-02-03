# Gemini Coder

With dedicated context panel you can manually select related folders and files to your task at hand, then use one of the available commands for:

- automatically initialized chats in AI Studio (no API key needed),
- FIM completions,
- applying suggested changes to files.

For a seamless developer experience, install dedicated browser extension for hands-free chat initialization.

- [Install for Chrome](https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Install for Firefox](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/)

[![ScreenShot](https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/vscode/resources/preview.png)]()

## Features

- Handy workspace explorer tree for context selection.
- FIM completions at the cursor position.
- Automatically initialized chats in AI Studio.
- Applying suggested code changes.
- Provider agnostic, read more "Set up custom providers" section below.
- Web chat agnostic, read more "Configure additional web chats" section below.

## How to use Autocomplete

1.  Open the Context View and select all relevant folders/files you want to attach as context in each request.
2.  Place the cursor where you want to insert code completion.
3.  Open the Command Palette (`Ctrl+Shift+P`).
4.  Run one of the following commands (listed below).
5.  Bind commands to a key combination of your choice in `Preferences: Open Keyboard Shortcuts`, e.g., `Ctrl+P` for `Gemini Coder: Request FIM completion`.

## Commands

#### FIM completions

- `Gemini Coder: Request FIM completion` - Get fill-in-the-middle completion using default model
- `Gemini Coder: Request FIM completion with...` - Get fill-in-the-middle completion with model selection
- `Gemini Coder: Copy FIM Completion Prompt to Clipboard` - Copy FIM prompt with context
- `Gemini Coder: Open Web Chat with FIM Completion Prompt` - Open web chat with FIM prompt

#### Applying changes

- `Gemini Coder: Apply Changes to this File` - Apply changes suggested by AI
- `Gemini Coder: Copy Apply Changes Prompt to Clipboard` - Copy apply changes prompt
- `Gemini Coder: Open Web Chat with Apply Changes Prompt` - Open web chat with refactoring prompt

#### Chat Interactions

- `Gemini Coder: Open Web Chat with instruction...` - Compose custom prompt with context
- `Gemini Coder: Compose Chat Prompt to Clipboard` - Create chat prompt with context/prefix/suffix

#### Context Management

- `Gemini Coder: Copy Context` - Copy selected files as XML context
- `Gemini Coder: Clear all checks` - Clear all file selections
- `Gemini Coder: Change Default Model` - Change default AI model

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

## Configure additional web chats

You can configure additional web chats in settings, for example:

```json
"geminiCoder.additionalWebChats": [
    { "name": "DeepSeek", "url": "https://chat.deepseek.com/" }
  ],
```

## License

MIT

This is not an official Google product.

## Author

[Robert Piosik](https://buymeacoffee.com/robertpiosik)
