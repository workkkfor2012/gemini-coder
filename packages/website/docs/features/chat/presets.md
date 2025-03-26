---
hide_table_of_contents: true
---

# Presets

Presets allow you to create general or task-specific chat configurations. They are stored in your settings under key `geminiCoder.presets`.

Here is an example of a preset:

```json
{
  "name": "Example Preset",
  "chatbot": "AI Studio",
  "promptPrefix": "Help diagnose this error:",
  "promptSuffix": "Keep your response concise.",
  "model": "gemini-2.0-flash",
  "systemInstructions": "You are a helpful coding assistant. Format your response in bullet points.",
  "temperature": 0.5,
  "options": []
}
```

We make every effort to let you control initialization of your favorite chatbot to the fullest. Check below what configuration options are available across supported chatbots.

<details>
<summary><strong>AI Studio</strong></summary>

Supported configuration options:

#### ✅ Hands-free initialization

#### ✅ `model`

- Gemini 2.0 Flash: `gemini-2.0-flash`
- Gemini 2.0 Flash-Lite: `gemini-2.0-flash-lite`
- Gemini 2.5 Pro Exp 03-25: `gemini-2.5-pro-exp-03-25`
- Gemini 2.0 Flash Thinking Exp 01-21: `gemini-2.0-flash-thinking-exp-01-21`

#### ✅ `systemInstructions`

#### ✅ `temperature`

Range: `0-1`

#### ��� `options`

</details>

<details>
<summary><strong>Gemini</strong></summary>

#### ✅ Hands-free initialization

#### ❌ `model`

#### ❌ `systemInstructions`

#### ❌ `temperature`

#### ✅ `options`

- `canvas`: Enable canvas mode

</details>

<details>
<summary><strong>ChatGPT</strong></summary>

#### ✅ Hands-free initialization

#### ❌ `model`

#### ❌ `systemInstructions`

#### ❌ `temperature`

#### ❌ `options`

</details>

<details>
<summary><strong>Claude</strong></summary>

#### ✅ Hands-free initialization

#### ❌ `model`

#### ❌ `systemInstructions`

#### ❌ `temperature`

#### ❌ `options`

</details>

<details>
<summary><strong>Github Copilot</strong></summary>

#### ✅ Hands-free initialization

#### ✅ `model`

- GPT-4o: `4o`
- o1: `o1`
- o3-mini: `o3-mini`
- Claude 3.5 Sonnet: `sonnet-3.5`
- Claude 3.7 Sonnet: `sonnet-3.7`
- Claude 3.7 Sonnet Thinking: `sonnet-3.7-thinking`
- Gemini 2.0 Flash: `gemini-2.0-flash`

#### ❌ `systemInstructions`

#### ❌ `temperature`

#### ❌ `options`

</details>

<details>
<summary><strong>Grok</strong></summary>

#### ✅ Hands-free initialization

#### ❌ `model`

#### ❌ `systemInstructions`

#### ❌ `temperature`

#### ❌ `options`

</details>

<details>
<summary><strong>DeepSeek</strong></summary>

#### ✅ Hands-free initialization

#### ❌ `model`

#### ❌ `systemInstructions`

#### ❌ `temperature`

#### ❌ `options`

</details>

<details>
<summary><strong>Mistral</strong></summary>

#### ✅ Hands-free initialization

#### ❌ `model`

#### ❌ `systemInstructions`

#### ❌ `temperature`

#### ❌ `options`

</details>

<details>
<summary><strong>HuggingChat</strong></summary>

#### ✅ Hands-free initialization

#### ❌ `model`

#### ❌ `systemInstructions`

#### ❌ `temperature`

#### ❌ `options`

</details>

<details>
<summary><strong>Open WebUI</strong></summary>

#### ✅ Hands-free initialization

#### ❌ `model`

#### ❌ `systemInstructions`

#### ❌ `temperature`

#### ❌ `options`

</details>
