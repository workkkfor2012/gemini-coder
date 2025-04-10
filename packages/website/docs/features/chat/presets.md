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

We make every effort to let you control initialization of your favorite chatbot to the fullest.

You will find available configuration options below.

<details>
<summary><strong>AI Studio</strong></summary>

Supported configuration options:

#### ✅ Hands-free initialization

#### ✅ `model`

- Gemini 2.0 Flash: `gemini-2.0-flash`
- Gemini 2.0 Flash-Lite: `gemini-2.0-flash-lite`
- Gemini 2.5 Pro Preview 03-25: `gemini-2.5-pro-preview-03-25`
- Gemini 2.0 Flash Thinking Exp 01-21: `gemini-2.0-flash-thinking-exp-01-21`

#### ✅ `systemInstructions`

#### ✅ `temperature`

Range: `0-1`

</details>

<details>
<summary><strong>Gemini</strong></summary>

#### ✅ Hands-free initialization

#### ✅ `model`

- 2.0 Flash: `2.0-flash`
- 2.0 Flash Thinking: `2.0-flash-thinking`
- 2.5 Pro: `2.5-pro`

#### ✅ `options`

- `canvas`: Enable canvas mode

</details>

<details>
<summary><strong>Open WebUI</strong></summary>

#### ✅ Hands-free initialization

#### ✅ `model`

#### ✅ `systemInstructions`

#### ✅ `temperature`

#### ✅ `port`

Check port on which your instance is exposed in localhost, by default it's `3000`. If not given, `http://openwebui/` will be used, which you can forward your networked instance to.

Example nginx configuration:

```
server {
    listen 80;
    server_name openwebui;

    location / {
        proxy_pass http://localhost:3000; <-- URL of the instance
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket specific headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeout settings for WebSocket
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}

```

</details>

<details>
<summary><strong>OpenRouter</strong></summary>

#### ✅ Hands-free initialization

#### ✅ `model`

#### ✅ `systemInstructions`

#### ✅ `temperature`

</details>

<details>
<summary><strong>ChatGPT</strong></summary>

#### ✅ Hands-free initialization

</details>

<details>
<summary><strong>Claude</strong></summary>

#### ✅ Hands-free initialization

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

</details>

<details>
<summary><strong>Grok</strong></summary>

#### ✅ Hands-free initialization

#### ✅ `options`

- `think`: Enable Think mode

</details>

<details>
<summary><strong>DeepSeek</strong></summary>

#### ✅ Hands-free initialization

#### ✅ `options`

- `deep-think`: Enable DeepThink (R1) mode
- `search`: Enable search mode

</details>

<details>
<summary><strong>Mistral</strong></summary>

#### ✅ Hands-free initialization

</details>

<details>
<summary><strong>HuggingChat</strong></summary>

#### ✅ Hands-free initialization

</details>
