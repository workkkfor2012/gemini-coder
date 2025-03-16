---
hide_table_of_contents: true
sidebar_position: 2
---

# Chat

Chat view is a conventient way to generate messages with context and instructions.

With the [browser integration](/docs/installation/web-browser-integration), chats are initialized hands-free. Gemini Coder Connector supports AI Studio, Gemini and 10+ other popular chatbots.

:::tip

Instead of submitting follow-up messages in the chatbot consider starting over from VS Code with refined instructions.

:::

:::tip

To save response generation time and fit in max output size limits AI will often skip unchanged fragments in its generations. Don't worry, just copy such truncated code and [integrate it](/docs/features/apply-changes) with the original file.

:::

## Workflow

1. **Select Context:**
   Choose relevant files by opening them or selecting in the Workspace view.

2. **Write Your Prompt:**
   Enter your instruction.

3. **Choose Chat Provider:**
   Select one or more chatbots for hands-free initialization.

4. **Interact:**
   Enter follow-up prompts in the web browser or refine context and instructions (better results).

5. **Apply changes:**
   After getting response from the AI platform, you can use the [Apply Changes](/docs/features/apply-changes) feature to integrate the suggested changes to each modified file.

## Chatbot compatibility

Gemini Coder integrates with numerous popular chatbots with varying support for preset-defined initialization params.

| Chatbot        | Initialization | Model | System Instructions | Temperature | Max input tokens |
| -------------- | :------------: | :---: | :-----------------: | :---------: | :--------------: |
| **AI Studio**  |       ✅       |  ✅   |         ✅          |     ✅      |      1-2M\*      |
| **Gemini**     |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| ChatGPT        |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| Claude         |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| GitHub Copilot |       ✅       |  ❌   |         ❌          |     ❌      |     8-17k\*      |
| Grok           |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| DeepSeek       |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| Mistral        |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |
| Open WebUI     |       ✅       |  ❌   |         ❌          |     ❌      |        ?         |

\* Depends on factors like used model and subscription plan.

## Presets

Preset is a web chat configuration for specialized use case.

Each preset can include:

- Target platform (ChatGPT, Gemini, Claude, etc.)
- Prompt prefix/suffix
- Model selection (for supported platforms)
- Temperature setting
- Custom system instructions

## Best Practices

### Focused Context

Select only relevant files to avoid overwhelming the AI with irrelevant information.

### Clear Instructions

Frame your questions specifically, mentioning any constraints or requirements.

### Multiple Providers

Compare responses across different AI platforms for challenging problems.

### Leverage Presets

Create presets for specific tasks (debugging, refactoring, explaining) with appropriate prompt prefixes and suffixes.

## Available Commands

##### `Gemini Coder: Web Chat`

Opens a chat session in your browser with the current context and prompt.

##### `Gemini Coder: Web Chat with...`

Lets you select which AI platform to use for your chat session.

##### `Gemini Coder: Chat to Clipboard`

Instead of opening a chat directly, copies the context and prompt to your clipboard for manual pasting.
