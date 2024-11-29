# Gemini FIM

## Description

Gemini FIM let's you use Gemini as a Fill-in-the-middle coding assistant. With special prompting techinque the extension infills expected code while utilizing Gemini's large context window.

Set up a keybinding for the command: "Gemini FIM: Run" and enjoy quick, intelligent completions.

Use the command "Gemini FIM: Insert <FIM></FIM> tokens" to provide detailed instructions for the intended filling between special tokens <FIM>your instructions</FIM>, then run as always.

## How to Use

1. Open all relevant files which you want to attach as context for the model.
2. Place the cursor where you want to insert code completion.
3. Open the Command Palette (`Ctrl+Shift+P`).
4. Run the command `Gemini FIM: Run`.

## Good to know

- Rate limited Gemini Pro requests fallback to Gemini Flash.
- Divide API keys with comma to cycle between them for each request.
- Supports other OpenAI API compatible providers.

## Author

Robert Piosik

Check out my open source browser extension and app "Taaabs" https://chromewebstore.google.com/detail/taaabs-zero-knowledge-boo/mfpmbjjgeklnhjmpahigldafhcdoaona

## License

MIT
