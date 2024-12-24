# Gemini Coder

## Description

Gemini Coder let's you use Gemini for FIM (Fill in the middle) and file refactoring.

With dedicated context panel, you can granually select context attached with each completion/refactoring request.

Extension also lets you copy context to clipboard so you can comfortably switch between the editor and AI Studio.

[![ScreenShot](resources/preview.png)]()

## Features

- 100% free.
- Autocomplete on cursor position.
- Refactor current file.
- Primary and secondary models gives better control over cost.
- Manually add experimenal models or other OpenAI compatible providers.
- Copy context and continue your work in AI Studio.
- Rate limited Gemini Pro requests fallback to Gemini Flash.

## How to Use

1. Open Context View and select all relevant folders/files which you want to attach as context in each completion request.
2. Place the cursor where you want to insert code completion.
3. Open the Command Palette (`Ctrl+Shift+P`).
4. Run the command `Gemini Coder: Autocomplete ...`.
5. Bind the command to a key combination of your choice in `Preferences: Open Keyboard Shortcuts`, e.g. Ctrl+P for Primary Model and Alt+P for Secondary Model.

## Author

Robert Piosik

Check out my open source browser extension for bookmarking and AI assistance while browsing the Web: https://chromewebstore.google.com/detail/taaabs-zero-knowledge-boo/mfpmbjjgeklnhjmpahigldafhcdoaona

## License

MIT

This is not an official Google product.
